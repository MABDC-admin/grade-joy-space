import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SCHOOL_ID = 'f4d0e774-9386-4f3d-8c85-9a40ae285cb9' // M.A Brain Development Center

// Grade levels mapping (excluding Grade 3)
const TEACHERS_TO_CREATE = [
  { email: 'kinder@mabdc.org', full_name: 'Kindergarten Teacher', grade_level_id: '842ae78c-3f23-4c2b-9016-751ec98dd277' },
  { email: 'grade1@mabdc.org', full_name: 'Grade 1 Teacher', grade_level_id: '325dc131-4da3-4889-b500-fede6b73c1aa' },
  { email: 'grade2@mabdc.org', full_name: 'Grade 2 Teacher', grade_level_id: '6b68b473-1e90-499f-a3a2-63e0ca296828' },
  // Skip Grade 3: 94442399-512d-4e73-b9b0-bb9ba68415e4
  { email: 'grade4@mabdc.org', full_name: 'Grade 4 Teacher', grade_level_id: '07a76de6-aacc-49ea-b08e-433b8875f976' },
  { email: 'grade5@mabdc.org', full_name: 'Grade 5 Teacher', grade_level_id: 'ee860eba-af76-4bc8-8e56-f130673fffa3' },
  { email: 'grade6@mabdc.org', full_name: 'Grade 6 Teacher', grade_level_id: 'e6982126-2124-4596-b0ba-0b7477666164' },
  { email: 'grade7@mabdc.org', full_name: 'Grade 7 Teacher', grade_level_id: '04882d9d-d3cf-48de-960a-481f0ab0f00d' },
  { email: 'grade8@mabdc.org', full_name: 'Grade 8 Teacher', grade_level_id: '4d1e07d4-01d3-4196-bed4-9a5047cd5363' },
  { email: 'grade9@mabdc.org', full_name: 'Grade 9 Teacher', grade_level_id: 'c3432c87-1b96-475c-8b74-7a269b6db804' },
  { email: 'grade10@mabdc.org', full_name: 'Grade 10 Teacher', grade_level_id: '3c5fa614-7245-45c7-9d98-6675ba802392' },
  { email: 'grade11@mabdc.org', full_name: 'Grade 11 Teacher', grade_level_id: 'ece01ec9-107d-4300-b1fb-210b64e2020c' },
  { email: 'grade12@mabdc.org', full_name: 'Grade 12 Teacher', grade_level_id: 'e1879398-e46d-4497-9b83-0fccd70b3cdb' },
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Create admin client with service role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Verify caller is admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: authError } = await adminClient.auth.getUser(token)
    
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: isAdmin } = await adminClient.rpc('has_role', {
      _user_id: caller.id,
      _role: 'admin'
    })

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Only admins can seed teachers' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results: { email: string; success: boolean; error?: string }[] = []
    const password = '123456'

    for (const teacher of TEACHERS_TO_CREATE) {
      console.log(`Creating teacher: ${teacher.email}`)
      
      try {
        // Check if user already exists
        const { data: existingProfiles } = await adminClient
          .from('profiles')
          .select('user_id')
          .eq('email', teacher.email)
          .limit(1)

        if (existingProfiles && existingProfiles.length > 0) {
          console.log(`Teacher ${teacher.email} already exists, skipping`)
          results.push({ email: teacher.email, success: false, error: 'Already exists' })
          continue
        }

        // Create the user
        const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
          email: teacher.email,
          password: password,
          email_confirm: true,
          user_metadata: { full_name: teacher.full_name }
        })

        if (createError) {
          console.error(`Error creating ${teacher.email}:`, createError)
          results.push({ email: teacher.email, success: false, error: createError.message })
          continue
        }

        const newUserId = authData.user.id
        console.log(`User ${teacher.email} created with ID: ${newUserId}`)

        // Upsert profile with school_id
        await adminClient
          .from('profiles')
          .upsert({
            user_id: newUserId,
            email: teacher.email,
            full_name: teacher.full_name,
            school_id: SCHOOL_ID,
          }, { onConflict: 'user_id' })

        // Delete any existing roles and add teacher role
        await adminClient
          .from('user_roles')
          .delete()
          .eq('user_id', newUserId)

        await adminClient
          .from('user_roles')
          .insert({ user_id: newUserId, role: 'teacher' })

        // Assign grade level
        await adminClient
          .from('teacher_grade_levels')
          .insert({
            teacher_id: newUserId,
            grade_level_id: teacher.grade_level_id,
          })

        console.log(`Teacher ${teacher.email} fully set up`)
        results.push({ email: teacher.email, success: true })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        console.error(`Failed to create ${teacher.email}:`, errorMessage)
        results.push({ email: teacher.email, success: false, error: errorMessage })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    return new Response(
      JSON.stringify({ 
        message: `Created ${successCount} teachers, ${failCount} failed or already existed`,
        results 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
