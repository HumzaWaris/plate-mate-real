import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Configuration, OpenAIApi } from "openai-edge";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
const openai = new OpenAIApi(configuration);

const hall_locations: Record<string, [number, number]> = {
  Wiley: [40.428545, -86.920841],
  Ford: [40.432209, -86.919563],
  Earhart: [40.489681, -87.091461],
  Windsor: [40.426421, -86.919204],
  Hillenbrand: [40.427398681640625, -86.92676544189453],
};

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dphi = ((lat2 - lat1) * Math.PI) / 180;
  const dlambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dphi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function getTop3ClosestHalls(userLocation: [number, number]): Array<[string, number]> {
  const distances: Array<[string, number]> = Object.entries(hall_locations).map(
    ([hall, coords]) => {
      const [lat, lon] = coords;
      return [hall, haversine(userLocation[0], userLocation[1], lat, lon)] as [string, number];
    }
  );
  distances.sort((a, b) => a[1] - b[1]);
  return distances.slice(0, 3);
}

async function getMealItemsFromSupabase(mealType: string): Promise<any[]> {
  try {
    const { data, error } = await supabase.from("food_data").select("*").ilike("meal_type", mealType);
    if (error) {
      console.error(`Error retrieving ${mealType} items: ${error.message}`);
      return [];
    }
    return data || [];
  } catch (e) {
    console.error(`Error retrieving ${mealType} items: ${e}`);
    return [];
  }
}

function filterItemsByHalls(items: any[], halls: Array<[string, number]>): any[] {
  const allowedHalls = halls.map(([hall]) => hall);
  return items.filter((item) => allowedHalls.includes(item.dining_hall ?? ""));
}

function calculateDailyCalories(weight: number, goal: string): number {
  const baseCalories = weight * 15;
  switch (goal) {
    case "gain":
      return baseCalories + 500;
    case "lose":
      return baseCalories - 500;
    default:
      return baseCalories;
  }
}

function formatItems(items: any[]): string {
  return items
    .map(
      (item) =>
        `- ${item.food_name || "Unknown"} (${item.calorie || "?"} cal, ${item.protein || "?"}g protein)`
    )
    .join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const weight = parseFloat(body.weight);
    const height = parseFloat(body.height);
    const userLat = parseFloat(body.userLat);
    const userLon = parseFloat(body.userLon);
    const goal: string = body.goal?.toLowerCase() || "maintain";
    const preferences: string[] = body.preferences || [];
    const user_id = body.user_id;

    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user_id)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Error checking for existing user:", fetchError.message);
    }

    if (existingUser) {
      // Update existing user
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          startingWeight: weight,
          heightInches: height,
          goal,
          restrictions: preferences.join(", "),
          userLat,
          userLon,
        })
        .eq("user_id", user_id);

      if (updateError) {
        console.error("Error updating user profile:", updateError.message);
      }
    } else {
      // Insert new user
      const { error: insertError } = await supabase
        .from("profiles")
        .insert([{
          user_id,
          startingWeight: weight,
          heightInches: height,
          goal,
          restrictions: preferences.join(", "),
          userLat,
          userLon,
        }]);

      if (insertError) {
        console.error("Error inserting user profile:", insertError.message);
      }
    }

    const userLocation: [number, number] = [userLat, userLon];
    const closest_halls = getTop3ClosestHalls(userLocation);
    const daily_calories = calculateDailyCalories(weight, goal);
    const breakfast_calories = daily_calories * 0.5;
    const lunch_calories = daily_calories * 0.36;
    const dinner_calories = daily_calories * 0.14;

    const [breakfast_items, lunch_items, dinner_items] = await Promise.all([
      getMealItemsFromSupabase("Breakfast"),
      getMealItemsFromSupabase("Lunch"),
      getMealItemsFromSupabase("Dinner"),
    ]);

    const breakfast_filtered = filterItemsByHalls(breakfast_items, closest_halls);
    const lunch_filtered = filterItemsByHalls(lunch_items, closest_halls);
    const dinner_filtered = filterItemsByHalls(dinner_items, closest_halls);

    const hall_names_list = closest_halls
      .map(([hall, dist]) => `${hall} (${dist.toFixed(2)} mi)`).join(", ");

    const prompt = `
I have the following meal items from the top 3 closest dining halls to the user.
The halls are: ${hall_names_list}.

Meal breakdown:
----------------
User Details:
- Weight: ${weight} lbs
- Height: ${height} inches
- Goal: ${goal}
- Daily Calorie Goal: ${daily_calories.toFixed(0)} calories

Calorie Allocation:
- Breakfast: ${breakfast_calories.toFixed(0)} calories
- Lunch: ${lunch_calories.toFixed(0)} calories
- Dinner: ${dinner_calories.toFixed(0)} calories

User Preferences/Restrictions: ${preferences.join(", ")}

Breakfast Items:
${formatItems(breakfast_filtered)}

Lunch Items:
${formatItems(lunch_filtered)}

Dinner Items:
${formatItems(dinner_filtered)}

Please generate a coherent meal plan recommendation for today that:
1. Uses only the items listed above from the top 3 closest dining halls.
2. Includes breakfast, lunch, and dinner.
3. Meets the calorie targets for each meal.
4. Honors the user's preferences and their goal.
5. Please note which dining hall the foods are at.

KEEP IT SIMPLE
`;

    const completion = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a nutrition and meal planning expert.",
        },
        { role: "user", content: prompt },
      ],
    });

    const response = await completion.json();
    console.log(response)
    const meal_plan = response.choices[0].message?.content;

    return NextResponse.json({ mealPlan: meal_plan });
  } catch (error) {
    console.error("Error generating meal plan:", error);
    return NextResponse.json(
      { error: "Error generating meal plan" },
      { status: 500 }
    );
  }
}