// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

console.log("Hello from Functions!")

Deno.serve(async (req) => {
  const { name } = await req.json()
  const data = {
    message: `Hello ${name}!`,
  }

  return new Response(
    JSON.stringify(data),
    { headers: { "Content-Type": "application/json" } },
  )
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/exercise' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

interface ExerciseLog {
  user_id: string
  timestamp: Date
}

async function getTotalExerciseDayCount(supabaseClient: SupabaseClient, user_id: string) {
  const { data: totalExerciseDayCount, error } = await supabaseClient.from('exercise_logs').select('count(*)').eq('user_id', user_id)
  if (error) throw error

  return new Response(JSON.stringify({ totalExerciseDayCount }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
}

// async function getCurrentExerciseDayStreak(supabaseClient: SupabaseClient, id: string) {
// }

async function createExerciseLog(supabaseClient: SupabaseClient, exerciseLog: ExerciseLog) {
  const { error } = await supabaseClient.from('exercise_logs').insert(exerciseLog)
  if (error) throw error

  return new Response(JSON.stringify({ exerciseLog }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 201,
  })
}
