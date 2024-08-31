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

async function getExerciseLogsForMonth(
  supabaseClient: SupabaseClient,
  user_id: string,
  year: number,
  month: number
) {
  console.log("start getExerciseLogsForMonth function");

  const beginDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const { data, error } = await supabaseClient
    .from("exercise_logs")
    .select("timestamp")
    .eq("user_id", user_id)
    .gte("timestamp", beginDate.toISOString())
    .lt("timestamp", endDate.toISOString())
    .order("timestamp");
  if (error) throw error;

  return new Response(JSON.stringify({ exercise_logs_for_month: data }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
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

    const exercisePattern = new URLPattern({
      pathname: "/exercise/:user_id/:year/:month",
    });
    const matchingPath = exercisePattern.exec(url);
    const user_id = matchingPath ? matchingPath.pathname.groups.user_id : null;
    const year = matchingPath ? matchingPath.pathname.groups.year : null;
    const month = matchingPath ? matchingPath.pathname.groups.month : null;

    let exerciseLog: ExerciseLog | null = null;
    if (method === "POST") {
      const body = await req.json();
      exerciseLog = body;
    }

    switch (true) {
      case method === "POST":
        return createExerciseLog(supabaseClient, exerciseLog as ExerciseLog);
      case user_id && year && month && method === "GET":
        return getExerciseLogsForMonth(
          supabaseClient,
          user_id as string,
          Number(year),
          Number(month)
        );
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
