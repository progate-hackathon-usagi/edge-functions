import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ExerciseLog {
  user_id: string;
  timestamp: Date;
}

async function createExerciseLog(
  supabaseClient: SupabaseClient,
  exerciseLog: ExerciseLog
) {
  console.log("start createExerciseLog function");

  const { error } = await supabaseClient
    .from("exercise_logs")
    .insert(exerciseLog);
  if (error) throw error;

  return new Response(JSON.stringify({ exercise_log: exerciseLog }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 201,
  });
}

Deno.serve(async (req) => {
  const { url, method } = req;

  if (method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",

      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    let exerciseLog: ExerciseLog | null = null;
    if (method === "POST") {
      const body = await req.json();
      exerciseLog = body;
    }

    switch (true) {
      case method === "POST":
        return createExerciseLog(supabaseClient, exerciseLog);
      default:
        throw new Error("Invalid request");
    }
  } catch (error) {
    console.error(error);

    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
