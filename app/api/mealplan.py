import json
import math
import os
import openai
from supabase import create_client

# ======= Configuration =======
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

openai.api_key = os.environ.get("OPENAI_API_KEY")

# ======= Dining Hall Locations (lat, lon) =======
hall_locations = {
    "Wiley Dining": (40.428545, -86.920841),
    "Ford Dining": (40.432209, -86.919563),
    "Earhart Dining": (40.489681, -87.091461),
    "Windsor Dining": (40.426421, -86.919204),
    "Hillenbrand Dining": (40.427398681640625, -86.92676544189453),
}

# ======= Helper Functions =======
def haversine(lat1, lon1, lat2, lon2):
    R = 3958.8
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda/2)**2
    return R * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))

def get_top_3_closest_halls(user_location):
    distances = [
        (hall, haversine(user_location[0], user_location[1], lat, lon))
        for hall, (lat, lon) in hall_locations.items()
    ]
    distances.sort(key=lambda x: x[1])
    return distances[:3]

def get_meal_items_from_supabase(meal_type):
    try:
        response = supabase.table("food_data").select("*").ilike("meal_type", meal_type).execute()
        data = response.data if hasattr(response, 'data') else []
        return data
    except Exception as e:
        print(f"Error retrieving {meal_type} items: {e}")
        return []

def filter_items_by_halls(items, halls):
    allowed_halls = [hall for hall, _ in halls]
    return [item for item in items if item.get("dining_hall", "") in allowed_halls]

def calculate_daily_calories(weight):
    return weight * 15

def format_items(items):
    return "\n".join([
        f"- {item.get('food_name', 'Unknown')} ({item.get('calorie', '?')} cal, {item.get('protein', '?')}g protein)"
        for item in items
    ])

# ======= Serverless Function Handler =======
def handler(request):
    """
    This function expects a POST request with a JSON payload containing:
      - weight (lbs)
      - height (inches)
      - userLat (latitude)
      - userLon (longitude)
      - preferences (optional list of dietary restrictions/preferences)
    """
    # Check that the method is POST
    if request.method != "POST":
        return {
            "statusCode": 405,
            "body": json.dumps({"error": "Method not allowed"})
        }
    
    try:
        body = json.loads(request.body)
        weight = float(body["weight"])
        height = float(body["height"])
        user_lat = float(body["userLat"])
        user_lon = float(body["userLon"])
        preferences = body.get("preferences", [])
    except Exception as e:
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "Missing or invalid parameters"})
        }
    
    user_location = (user_lat, user_lon)
    closest_halls = get_top_3_closest_halls(user_location)
    daily_calories = calculate_daily_calories(weight)
    breakfast_calories = daily_calories * 0.5
    lunch_calories = daily_calories * 0.36
    dinner_calories = daily_calories * 0.14

    # Retrieve meal items for each meal type
    breakfast_items = get_meal_items_from_supabase("breakfast")
    lunch_items = get_meal_items_from_supabase("lunch")
    dinner_items = get_meal_items_from_supabase("dinner")

    breakfast_filtered = filter_items_by_halls(breakfast_items, closest_halls)
    lunch_filtered = filter_items_by_halls(lunch_items, closest_halls)
    dinner_filtered = filter_items_by_halls(dinner_items, closest_halls)

    hall_names_list = ", ".join([f"{hall} ({dist:.2f} mi)" for hall, dist in closest_halls])

    prompt = f"""
I have the following meal items from the top 3 closest dining halls to the user.
The halls are: {hall_names_list}.

Meal breakdown:
----------------
User Details:
- Weight: {weight} lbs
- Height: {height} inches
- Daily Calorie Goal: {daily_calories:.0f} calories

Calorie Allocation:
- Breakfast: {breakfast_calories:.0f} calories
- Lunch: {lunch_calories:.0f} calories
- Dinner: {dinner_calories:.0f} calories

User Preferences/Restrictions: {', '.join(preferences)}

Breakfast Items:
{format_items(breakfast_filtered)}

Lunch Items:
{format_items(lunch_filtered)}

Dinner Items:
{format_items(dinner_filtered)}

Please generate a coherent meal plan recommendation for today that:
1. Uses only the items listed above from the top 3 closest dining halls.
2. Includes breakfast, lunch, and dinner.
3. Meets the calorie targets for each meal.
4. Honors the user's preferences.
5. Provides reasoning for your choices.
    """

    try:
        completion = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a nutrition and meal planning expert."},
                {"role": "user", "content": prompt}
            ]
        )
        meal_plan = completion.choices[0].message.content
    except Exception as e:
        print("Error generating meal plan:", e)
        return {
            "statusCode": 500,
            "body": json.dumps({"error": "Error generating meal plan"})
        }
    
    return {
        "statusCode": 200,
        "body": json.dumps({"mealPlan": meal_plan})
    }
