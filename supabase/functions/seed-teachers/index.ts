import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// School IDs
const MABDC_SCHOOL_ID = 'f4d0e774-9386-4f3d-8c85-9a40ae285cb9' // M.A Brain Development Center
const SFXSA_SCHOOL_ID = '45a0e774-1234-4f3d-8c85-9a40ae285abc' // St. Francis Xavier Smart Academy - will be fetched

// Grade levels mapping
const GRADE_LEVELS = [
  { name: 'Kindergarten', id: '842ae78c-3f23-4c2b-9016-751ec98dd277', order: 0 },
  { name: 'Grade 1', id: '325dc131-4da3-4889-b500-fede6b73c1aa', order: 1 },
  { name: 'Grade 2', id: '6b68b473-1e90-499f-a3a2-63e0ca296828', order: 2 },
  { name: 'Grade 3', id: '94442399-512d-4e73-b9b0-bb9ba68415e4', order: 3 },
  { name: 'Grade 4', id: '07a76de6-aacc-49ea-b08e-433b8875f976', order: 4 },
  { name: 'Grade 5', id: 'ee860eba-af76-4bc8-8e56-f130673fffa3', order: 5 },
  { name: 'Grade 6', id: 'e6982126-2124-4596-b0ba-0b7477666164', order: 6 },
  { name: 'Grade 7', id: '04882d9d-d3cf-48de-960a-481f0ab0f00d', order: 7 },
  { name: 'Grade 8', id: '4d1e07d4-01d3-4196-bed4-9a5047cd5363', order: 8 },
  { name: 'Grade 9', id: 'c3432c87-1b96-475c-8b74-7a269b6db804', order: 9 },
  { name: 'Grade 10', id: '3c5fa614-7245-45c7-9d98-6675ba802392', order: 10 },
  { name: 'Grade 11', id: 'ece01ec9-107d-4300-b1fb-210b64e2020c', order: 11 },
  { name: 'Grade 12', id: 'e1879398-e46d-4497-9b83-0fccd70b3cdb', order: 12 },
]

interface UserToCreate {
  email: string
  full_name: string
  grade_level_id: string
  school_id: string
  role: 'teacher' | 'student'
}

function generateUsersToCreate(schoolId: string, emailDomain: string, schoolCode: string, includeGrade3Teachers: boolean): UserToCreate[] {
  const users: UserToCreate[] = []
  
  for (const grade of GRADE_LEVELS) {
    const gradeKey = grade.name === 'Kindergarten' ? 'kinder' : grade.name.toLowerCase().replace(' ', '')
    
    // Add teacher (skip Grade 3 for MABDC)
    if (includeGrade3Teachers || grade.name !== 'Grade 3') {
      users.push({
        email: `${gradeKey}@${emailDomain}`,
        full_name: `${grade.name} Teacher`,
        grade_level_id: grade.id,
        school_id: schoolId,
        role: 'teacher'
      })
    }
    
    // Add student for each grade level
    users.push({
      email: `student.${gradeKey}@${emailDomain}`,
      full_name: `${grade.name} Student (${schoolCode})`,
      grade_level_id: grade.id,
      school_id: schoolId,
      role: 'student'
    })
  }
  
  return users
}

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
        JSON.stringify({ error: 'Only admins can seed users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch St. Francis school ID
    const { data: sfSchool } = await adminClient
      .from('schools')
      .select('id')
      .ilike('name', '%St. Francis%')
      .limit(1)
      .single()

    if (!sfSchool) {
      return new Response(
        JSON.stringify({ error: 'St. Francis school not found. Please create it first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const sfSchoolId = sfSchool.id

    // Generate all users to create
    const usersToCreate: UserToCreate[] = [
      // M.A Brain Development Center - Teachers (except Grade 3) + All Students
      ...generateUsersToCreate(MABDC_SCHOOL_ID, 'mabdc.org', 'MA', false),
      // St. Francis Xavier Smart Academy - All Teachers + All Students
      ...generateUsersToCreate(sfSchoolId, 'sfxsa.com', 'SF', true),
    ]

    const results: { email: string; role: string; success: boolean; error?: string }[] = []
    const password = '123456'

    for (const user of usersToCreate) {
      console.log(`Creating ${user.role}: ${user.email}`)
      
      try {
        // Check if user already exists
        const { data: existingProfiles } = await adminClient
          .from('profiles')
          .select('user_id')
          .eq('email', user.email)
          .limit(1)

        if (existingProfiles && existingProfiles.length > 0) {
          console.log(`User ${user.email} already exists, skipping`)
          results.push({ email: user.email, role: user.role, success: false, error: 'Already exists' })
          continue
        }

        // Create the user
        const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
          email: user.email,
          password: password,
          email_confirm: true,
          user_metadata: { full_name: user.full_name }
        })

        if (createError) {
          console.error(`Error creating ${user.email}:`, createError)
          results.push({ email: user.email, role: user.role, success: false, error: createError.message })
          continue
        }

        const newUserId = authData.user.id
        console.log(`User ${user.email} created with ID: ${newUserId}`)

        // Upsert profile with school_id and grade_level_id
        await adminClient
          .from('profiles')
          .upsert({
            user_id: newUserId,
            email: user.email,
            full_name: user.full_name,
            school_id: user.school_id,
            grade_level_id: user.grade_level_id,
          }, { onConflict: 'user_id' })

        // Delete any existing roles and add correct role
        await adminClient
          .from('user_roles')
          .delete()
          .eq('user_id', newUserId)

        await adminClient
          .from('user_roles')
          .insert({ user_id: newUserId, role: user.role })

        // If teacher, assign grade level
        if (user.role === 'teacher') {
          await adminClient
            .from('teacher_grade_levels')
            .insert({
              teacher_id: newUserId,
              grade_level_id: user.grade_level_id,
            })
        }

        console.log(`${user.role} ${user.email} fully set up`)
        results.push({ email: user.email, role: user.role, success: true })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        console.error(`Failed to create ${user.email}:`, errorMessage)
        results.push({ email: user.email, role: user.role, success: false, error: errorMessage })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length
    const teachersCreated = results.filter(r => r.success && r.role === 'teacher').length
    const studentsCreated = results.filter(r => r.success && r.role === 'student').length

    return new Response(
      JSON.stringify({ 
        message: `Created ${successCount} users (${teachersCreated} teachers, ${studentsCreated} students), ${failCount} failed or already existed`,
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
