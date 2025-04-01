import { NextRequest, NextResponse } from "next/server";
import { Configuration, OpenAIApi } from "openai-edge";
import supabase from "@/app/lib/supabase";


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

// ---------- New: Filter by Allergens ----------
// User restrictions come as an array (preferences)
// - If food has no allergens, allow it.
// - For "Vegetarian" or "Vegan", allow only if the user's restrictions include that term.
// - For any other allergen, if the user restrictions include it, filter it out.
function filterByAllergens(items: any[], restrictions: string[]): any[] {
  const lowerRestrictions = restrictions.map((r) => r.toLowerCase());
  return items.filter((item) => {
    if (!item.allergens) return true; // No allergens: allow
    // Split allergens (assuming CSV format)
    const allergens = item.allergens.split(",").map((a: string) => a.trim().toLowerCase());
    // Check for Vegetarian/Vegan: must be explicitly allowed
    if (!allergens.includes("vegetarian") && lowerRestrictions.includes("vegetarian")) {
      return false;
    }
    if (!allergens.includes("vegan") && lowerRestrictions.includes("vegan")) {
      return false;
    }
    // For other allergens: if user's restrictions include them, filter out
    for (const allergen of allergens) {
      if (allergen !== "vegetarian" && allergen !== "vegan") {
        if (lowerRestrictions.includes(allergen)) return false;
      }
    }
    return true;
  });
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
    const preferredFood: string = body.preferredFood || "";

    // Check if user exists in the profiles table
    const { data: existingUser, error: fetchError } = await supabase
      .from("profiles")
      .select("user_id")
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
          preferredFood,
        })
        .eq("user_id", user_id);
      if (updateError) {
        console.error("Error updating user profile:", updateError.message);
      }
    } else {
      // Insert new user
      const { error: insertError } = await supabase
        .from("profiles")
        .insert([
          {
            user_id,
            startingWeight: weight,
            heightInches: height,
            goal,
            restrictions: preferences.join(", "),
            userLat,
            userLon,
            preferredFood,
          },
        ]);
      if (insertError) {
        console.error("Error inserting user profile:", insertError.message);
      }
    }

    const userLocation: [number, number] = [userLat, userLon];
    const closest_halls = getTop3ClosestHalls(userLocation);
    const daily_calories = calculateDailyCalories(weight, goal);
    const breakfast_calories = daily_calories * 0.35;
    const lunch_calories = daily_calories * 0.35;
    const dinner_calories = daily_calories * 0.3;

    // Get meal items for each meal type
    const [breakfast_items, lunch_items, dinner_items] = await Promise.all([
      getMealItemsFromSupabase("Breakfast"),
      getMealItemsFromSupabase("Lunch"),
      getMealItemsFromSupabase("Dinner"),
    ]);

    // Filter by dining halls first...
    const breakfast_by_hall = filterItemsByHalls(breakfast_items, closest_halls);
    const lunch_by_hall = filterItemsByHalls(lunch_items, closest_halls);
    const dinner_by_hall = filterItemsByHalls(dinner_items, closest_halls);

    // ...then filter by allergens based on user restrictions (preferences)
    const breakfast_filtered = filterByAllergens(breakfast_by_hall, preferences);
    const lunch_filtered = filterByAllergens(lunch_by_hall, preferences);
    const dinner_filtered = filterByAllergens(dinner_by_hall, preferences);

    const hall_names_list = closest_halls
      .map(([hall, dist]) => `${hall} (${dist.toFixed(2)} mi)`)
      .join(", ");

    const prompt = `
I have the following meal items from the top 3 closest dining halls to the user.
The dining halls are: ${hall_names_list}.

User Details:
- Weight: ${weight} lbs
- Height: ${height} inches
- Goal: ${goal}
- Daily Calorie Goal: ${daily_calories.toFixed(0)} calories
- Preferred Food: ${preferredFood}

Calorie Allocation:
- Breakfast: ${breakfast_calories.toFixed(0)} calories
- Lunch: ${lunch_calories.toFixed(0)} calories
- Dinner: ${dinner_calories.toFixed(0)} calories

User Preferences/Restrictions: ${preferences.join(", ")}

Meal Items:
----------------
Breakfast Items:
${formatItems(breakfast_filtered)}

Lunch Items:
${formatItems(lunch_filtered)}

Dinner Items:
${formatItems(dinner_filtered)}

Using the information above, please generate a meal plan recommendation for today that meets the following requirements:
1. The response must consist of exactly 3 lines.
2. The first line corresponds to breakfast, the second to lunch, and the third to dinner.
3. Each line should start with the name of the dining court (from the available top 3 halls) from which the foods are sourced, followed by ":::" (three colons as a delimiter), and then a list of comma-separated food names. The food names must match exactly those from the provided meal items.
4. Do not include any additional text, explanations, or formatting. Only output the three lines in the format specified.
5. Please make sure the output aligns with the calorie/protein requirements above.

KEEP IT SIMPLE.
`;

    const completion = await openai.createChatCompletion({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: "You are a nutrition and meal planning expert.",
        },
        { role: "user", content: prompt },
      ],
    });

    const response = await completion.json();
    const meal_plan = response.choices[0].message?.content;

    return NextResponse.json({ mealPlan: meal_plan });
  } catch (error) {
    console.error("Error generating meal plan:", error);
    return NextResponse.json({ error: "Error generating meal plan" }, { status: 500 });
  }
}
