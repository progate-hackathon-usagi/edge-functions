import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

interface Profile {
  id: string;
  name: string;
}

interface UserProfileResponse {
  name: string;
  total_exercise_day_count: number;
  current_exercise_day_streak: number;
}

interface YMD {
  year: number;
  month: number;
  day: number;
}

async function createProfile(supabaseClient: SupabaseClient, profile: Profile) {
  const { error } = await supabaseClient.from("profiles").insert(profile);
  if (error) throw error;

  return new Response(JSON.stringify({ profile }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 201,
  });
}

async function getUserProfile(supabaseClient: SupabaseClient, id: string) {
  const { data, error } = await supabaseClient
    .from("v_user_profile_with_exercise_logs")
    .select("*")
    .eq("id", id);
  if (error) throw error;

  if (data.length === 0) {
    throw new Error("User not found");
  } else if (data.length === 1) {
    const userProfileResponse: UserProfileResponse = {
      name: data[0].user_name,
      total_exercise_day_count: 0,
      current_exercise_day_streak: 0,
    };

    return new Response(JSON.stringify({ user_profile: userProfileResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } else if (data.length > 1) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    let lastDate = null;
    let totalDayCount = 0;
    let currentStreak = 0;
    let isStreakActive =
      data[0].exercise_date.toDateString() === today.toDateString() ||
      data[0].exercise_date.toDateString() === yesterday.toDateString();

    for (const record of data) {
      const recordDate = new Date(record.exercise_date);

      totalDayCount++;

      if (
        isStreakActive &&
        (!lastDate || isOneDayBefore(recordDate, lastDate))
      ) {
        currentStreak++;
      } else {
        isStreakActive = false;
      }

      lastDate = recordDate;
    }

    const userProfileResponse: UserProfileResponse = {
      name: data[0].username,
      total_exercise_day_count: totalDayCount,
      current_exercise_day_streak: currentStreak,
    };

    return new Response(JSON.stringify({ user_profile: userProfileResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } else {
    throw new Error("Invalid Request");
  }
}

function isOneDayBefore(beforeDate: Date, afterDate: Date): boolean {
  const d1 = new Date(
    Date(beforeDate.getFullYear(), beforeDate.getMonth(), beforeDate.getDate())
  );
  const d2 = new Date(
    Date(afterDate.getFullYear(), afterDate.getMonth(), afterDate.getDate())
  );

  d2.setDate(d2.getDate() - 1);

  return d1.getTime() === d2.getTime();
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

    const profilePattern = new URLPattern({ pathname: "/profile" });
    const matchingPath = profilePattern.exec(url);
    const id = matchingPath ? matchingPath.pathname.groups.id : null;

    let profile = null;
    if (method === "POST") {
      const body = await req.json();
      profile = body.profile;
    }

    switch (true) {
      case method === "POST":
        return createProfile(supabaseClient, profile);
      case id && method === "GET":
        return getUserProfile(supabaseClient, id as string);
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
