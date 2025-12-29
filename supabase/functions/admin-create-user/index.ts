import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateUserRequest {
  email: string
  password: string
  full_name: string
  role: 'teacher' | 'student'
  school_id: string
  grade_level_id?: string
  grade_level_name?: string
  section?: string
  grade_level_ids?: string[] // For teachers: assigned grade levels
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Create admin client with service role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Verify caller's auth using the token directly
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Use admin client to verify the JWT token directly
    const { data: { user: caller }, error: authError } = await adminClient.auth.getUser(token)
    if (authError || !caller) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if caller is admin
    const { data: isAdmin } = await adminClient.rpc('has_role', {
      _user_id: caller.id,
      _role: 'admin'
    })

    if (!isAdmin) {
      console.error('Caller is not admin:', caller.id)
      return new Response(
        JSON.stringify({ error: 'Only admins can create users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body: CreateUserRequest = await req.json()
    console.log('Creating user:', { email: body.email, role: body.role, school_id: body.school_id })

    // Validate required fields
    if (!body.email || !body.password || !body.full_name || !body.role || !body.school_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, password, full_name, role, school_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!['teacher', 'student'].includes(body.role)) {
      return new Response(
        JSON.stringify({ error: 'Role must be either "teacher" or "student"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create the user using admin API
    const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: { full_name: body.full_name }
    })

    if (createError) {
      console.error('Create user error:', createError)
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const newUserId = authData.user.id
    console.log('User created with ID:', newUserId)

    // Use upsert for profile to handle both new users and trigger-created profiles
    const profileData = {
      user_id: newUserId,
      email: body.email,
      school_id: body.school_id,
      grade_level_id: body.grade_level_id || null,
      grade_level: body.grade_level_name || null,
      section: body.section || null,
      full_name: body.full_name,
    }

    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert(profileData, { onConflict: 'user_id' })

    if (profileError) {
      console.error('Profile upsert error:', profileError)
      // Continue anyway - profile might exist from trigger
    } else {
      console.log('Profile upserted successfully')
    }

    // Always ensure the correct role exists
    // First delete any existing roles for this user to start fresh
    const { error: deleteRoleError } = await adminClient
      .from('user_roles')
      .delete()
      .eq('user_id', newUserId)

    if (deleteRoleError) {
      console.error('Role delete error (non-fatal):', deleteRoleError)
    }

    // Insert the designated role
    const { error: roleError } = await adminClient
      .from('user_roles')
      .insert({ user_id: newUserId, role: body.role })

    if (roleError) {
      console.error('Role insert error:', roleError)
      return new Response(
        JSON.stringify({ 
          error: `User created but failed to assign ${body.role} role: ${roleError.message}`,
          user_id: newUserId,
          partial: true
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log(`${body.role} role assigned successfully`)

    // For teachers, assign grade levels if provided
    if (body.role === 'teacher' && body.grade_level_ids && body.grade_level_ids.length > 0) {
      console.log('Assigning grade levels to teacher:', body.grade_level_ids)
      
      const gradeLevelInserts = body.grade_level_ids.map(grade_level_id => ({
        teacher_id: newUserId,
        grade_level_id,
      }))

      const { error: gradeLevelError } = await adminClient
        .from('teacher_grade_levels')
        .insert(gradeLevelInserts)

      if (gradeLevelError) {
        console.error('Grade level assignment error (non-fatal):', gradeLevelError)
        // Non-fatal - teacher was created, grade levels can be assigned later
      } else {
        console.log('Grade levels assigned successfully')
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: newUserId,
        role_assigned: body.role,
        school_assigned: body.school_id,
        grade_levels_assigned: body.grade_level_ids?.length || 0,
        message: `${body.role} account created successfully with school assignment` 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Unexpected error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
