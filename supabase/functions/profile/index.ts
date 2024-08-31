import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
};

interface Profile {
  id: string;
  name: string;
}

interface UserProfileResponse {
  id: string;
  name: string;
  total_exercise_day_count: number;
  current_exercise_day_streak: number;
}

async function createProfile(supabaseClient: SupabaseClient, profile: Profile) {
  console.log("start createProfile function");

  const { error } = await supabaseClient.from("profiles").insert(profile);
  if (error) throw error;

  return new Response(JSON.stringify({ profile }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 201,
  });
}

async function updateProfile(supabaseClient: SupabaseClient, profile: Profile) {
  console.log("start updateProfile function");

  const { error } = await supabaseClient
    .from("profiles")
    .update(profile)
    .eq("id", profile.id);
  if (error) throw error;

  return new Response(JSON.stringify({ profile }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
}

async function getUserProfile(supabaseClient: SupabaseClient, id: string) {
  console.log("start getUserProfile function");

  const { data, error } = await supabaseClient
    .from("v_user_profile_with_exercise_days")
    .select("*")
    .eq("id", id);
  if (error) throw error;

  if (data.length === 0) {
    throw new Error("User not found");
  } else if (data.length === 1) {
    const userProfileResponse: UserProfileResponse = {
      id: data[0].id,
      name: data[0].username,
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

    let lastDate: Date | null = null;
    let totalDayCount = 0;
    let currentStreak = 0;
    let isStreakActive =
      areDatesEqual(new Date(data[0].exercise_date), today) ||
      areDatesEqual(new Date(data[0].exercise_date), yesterday);

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
      id: data[0].id,
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

function areDatesEqual(date1: Date, date2: Date): boolean {
  const d1 = new Date(date1.getFullYear(), date1.getMonth(), date1.getDate());
  const d2 = new Date(date2.getFullYear(), date2.getMonth(), date2.getDate());

  return d1.getTime() === d2.getTime();
}

function isOneDayBefore(beforeDate: Date, afterDate: Date): boolean {
  const d1 = new Date(
    new Date(
      beforeDate.getFullYear(),
      beforeDate.getMonth(),
      beforeDate.getDate()
    )
  );
  const d2 = new Date(
    new Date(afterDate.getFullYear(), afterDate.getMonth(), afterDate.getDate())
  );

  d2.setDate(d2.getDate() - 1);

  return d1.getTime() === d2.getTime();
}

Deno.serve(async (req) => {
  const { url, method } = req;
  console.log("url: ", url, ", method: ", method);

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

    const profilePattern = new URLPattern({ pathname: "/profile/:id" });
    const matchingPath = profilePattern.exec(url);
    const id = matchingPath ? matchingPath.pathname.groups.id : null;

    let profile: Profile | null = null;
    if (method === "POST" || method === "PUT") {
      const body = await req.json();
      console.log("body: ", body);
      profile = body;
    }

    switch (true) {
      case method === "POST":
        return createProfile(supabaseClient, profile as Profile);
      case id && method === "GET":
        return getUserProfile(supabaseClient, id as string);
      case id && method === "PUT":
        return updateProfile(supabaseClient, profile as Profile);
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
