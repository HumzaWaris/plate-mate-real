"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import "../globals.css";

// ---------- Supabase Setup ----------
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// ---------- Types ----------
interface MealPlanItem {
  meal: string;       // "Breakfast" | "Lunch" | "Dinner"
  diningHall: string; // e.g. "Windsor", "Ford", etc.
  foods: string[];    // e.g. ["Scrambled Eggs", "Hard Cooked Eggs"]
}

interface FoodData {
  id: number;
  food_name: string;
  dining_hall: string;
  calorie: number;
  protein: number;
  fat?: number;
  carbs?: number;
  allergens?: string;
  ingredients?: string;
  meal_type?: string;
  taste_profile?: string;
}

export default function Dashboard() {
  const router = useRouter();

  // ---------- State ----------
  const [formData, setFormData] = useState({
    startingWeight: "",
    heightInches: "",
    gender: "",
    restrictions: "",
    allergies: [] as string[],
    activity: "moderate",
    userLat: "",
    userLon: "",
    goal: "",
    preferredFood: "",
  });
  const [user, setUser] = useState<any>(null);
  const [showAllergens, setShowAllergens] = useState(false);

  const [mealPlan, setMealPlan] = useState<string>(""); // raw text from GPT
  const [mealPlanLoading, setMealPlanLoading] = useState(false);

  // Holds the final structured meal plan with data from Supabase
  const [parsedMeals, setParsedMeals] = useState<MealPlanItem[]>([]);
  const [foodDetails, setFoodDetails] = useState<FoodData[]>([]);

  // Track expanded state for each food item in an accordion style
  const [expandedFoods, setExpandedFoods] = useState<Record<string, boolean>>({});

  // ---------- On Mount: Populate lat/lon ----------
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData((prev) => ({
            ...prev,
            userLat: position.coords.latitude.toString(),
            userLon: position.coords.longitude.toString(),
          }));
        },
        (error) => console.error("Geolocation error:", error)
      );
    }
  }, []);

  // ---------- Retrieve user from Supabase Auth ----------
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        router.push("/login");
      } else {
        setUser(user);
      }
    };
    getUser();
  }, [router]);

  // ---------- Once we have the user, check if there's an existing profile ----------
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        if (error.code !== "PGRST116") {
          console.error("Error fetching profile:", error.message);
        }
        return;
      }

      if (profileData) {
        // Convert allergies from CSV or JSON into string[]
        let parsedAllergies: string[] = [];
        if (profileData.allergies) {
          try {
            const asJson = JSON.parse(profileData.allergies);
            if (Array.isArray(asJson)) {
              parsedAllergies = asJson.map((s: string) => s.trim());
            } else {
              parsedAllergies = profileData.allergies
                .split(",")
                .map((s: string) => s.trim());
            }
          } catch {
            parsedAllergies = profileData.allergies
              .split(",")
              .map((s: string) => s.trim());
          }
        }

        setFormData((prev) => ({
          ...prev,
          startingWeight: profileData.startingWeight?.toString() || "",
          heightInches: profileData.heightInches?.toString() || "",
          gender: profileData.gender || "",
          restrictions: profileData.restrictions || "",
          allergies: parsedAllergies,
          activity: profileData.activity || "moderate",
          goal: profileData.goal || "",
          preferredFood: profileData.preferredFood || "",
        }));
      }
    };

    fetchProfile();
  }, [user]);

  // ---------- Handle input changes ----------
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ---------- Handle checkbox changes for allergies ----------
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setFormData((prev) => {
      const newAllergies = checked
        ? [...prev.allergies, value]
        : prev.allergies.filter((a) => a !== value);
      return { ...prev, allergies: newAllergies };
    });
  };

  // ---------- Save profile to Supabase ----------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const allergiesString = formData.allergies.join(", ");

    const payload = {
      user_id: user.id,
      startingWeight: formData.startingWeight
        ? Number(formData.startingWeight)
        : null,
      heightInches: formData.heightInches ? Number(formData.heightInches) : null,
      gender: formData.gender || null,
      restrictions: formData.restrictions || null,
      allergies: allergiesString || null,
      activity: formData.activity || "moderate",
      goal: formData.goal || null,
      userLat: formData.userLat ? Number(formData.userLat) : null,
      userLon: formData.userLon ? Number(formData.userLon) : null,
      preferredFood: formData.preferredFood || null,
    };

    // Use upsert to handle both insert and update
    const { error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "user_id" });

    if (error) {
      console.error("Error saving profile:", error.message);
      alert("Error saving profile: " + error.message);
    } else {
      alert("Profile saved successfully!");
    }
  };

  // ---------- Generate meal plan ----------
  const handleGenerateMealPlan = async () => {
    setMealPlanLoading(true);

    const preferences = [
      ...(formData.restrictions
        ? formData.restrictions.split(",").map((s) => s.trim()).filter(Boolean)
        : []),
      ...formData.allergies,
    ];

    const body = {
      weight: formData.startingWeight,
      height: formData.heightInches,
      userLat: formData.userLat,
      userLon: formData.userLon,
      goal: formData.goal,
      preferences,
      preferredFood: formData.preferredFood,
    };

    try {
      const res = await fetch("/api/mealplan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setMealPlan(data.mealPlan);
    } catch (err) {
      console.error("Error generating meal plan:", err);
      setMealPlan("An error occurred while generating the meal plan.");
    }

    setMealPlanLoading(false);
  };

  // ---------- Parse the meal plan + fetch data from Supabase (by name only) ----------
  useEffect(() => {
    if (!mealPlan) return;

    function parseMealPlan(mealPlanText: string): MealPlanItem[] {
      const lines = mealPlanText
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const mealNames = ["Breakfast", "Lunch", "Dinner"];

      return lines.map((line, idx) => {
        const [hall, foodsStr] = line.split(":::");
        const diningHall = hall.trim();
        const foods = foodsStr
          .split(",")
          .map((f) => f.trim())
          .filter(Boolean);
        return {
          meal: mealNames[idx] || `Meal ${idx + 1}`,
          diningHall,
          foods,
        };
      });
    }

    const parsed = parseMealPlan(mealPlan);
    setParsedMeals(parsed);

    // Gather all foods from the parsed meal plan
    const allFoods = parsed.flatMap((p) => p.foods);

    // Fetch from Supabase using a simple name search
    const fetchFoodDetails = async () => {
      try {
        if (!allFoods.length) return;
        const { data, error } = await supabase
          .from("food_data")
          .select("*")
          .in("food_name", allFoods);
        if (error) {
          console.error("Error fetching food details:", error.message);
        } else if (data) {
          setFoodDetails(data);
        }
      } catch (err) {
        console.error("Error in fetchFoodDetails:", err);
      }
    };

    fetchFoodDetails();
  }, [mealPlan]);

  // ---------- Sign out function ----------
  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error.message);
    } else {
      router.push("/");
    }
  };

  // ---------- Helper to find a food's data (match by name only) ----------
  const getFoodData = (foodName: string) => {
    return foodDetails.find((item) => item.food_name === foodName);
  };

  // ---------- Toggle expand/collapse for a food item ----------
  const toggleExpand = (key: string) => {
    setExpandedFoods((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // ---------- Render ----------
  return (
    <div style={styles.container}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative" }}>
        <header style={styles.header}>
          <h1 style={styles.title}>Dashboard</h1>
          <div style={{ display: "flex", alignItems: "center" }}>
            <button
              style={styles.signOutButton}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor =
                  styles.buttonHover.backgroundColor;
                (e.currentTarget as HTMLElement).style.transform =
                  styles.buttonHover.transform;
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor =
                  styles.signOutButton.backgroundColor!;
                (e.currentTarget as HTMLElement).style.transform = "none";
              }}
              onClick={handleSignOut}
            >
              Sign Out
            </button>
          </div>
        </header>

        <main style={{ padding: "2rem", zIndex: 1 }}>
          {/* ----- Title ----- */}
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <h2 style={styles.mainHeading}>Nutrition Dashboard</h2>
            <p style={styles.subTitle}>
              Enter your details to receive a personalized AI-based meal plan
            </p>
          </div>

          {/* ----- Profile Form ----- */}
          <form onSubmit={handleSubmit} style={styles.card}>
            <h3 style={{ color: "#CEB888", marginBottom: "1.5rem", textAlign: "center" }}>
              Profile Information
            </h3>
            <div style={styles.twoColumnGrid}>
              <div style={styles.formColumn}>
                <div style={styles.formRow}>
                  <label style={styles.label}>Weight (lbs)</label>
                  <input
                    type="number"
                    name="startingWeight"
                    value={formData.startingWeight}
                    onChange={handleChange}
                    style={styles.input}
                  />
                </div>

                <div style={styles.formRow}>
                  <label style={styles.label}>Height (inches)</label>
                  <input
                    type="number"
                    name="heightInches"
                    value={formData.heightInches}
                    onChange={handleChange}
                    style={styles.input}
                  />
                </div>

                <div style={styles.formRow}>
                  <label style={styles.label}>Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    style={styles.input}
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div style={styles.formRow}>
                  <label style={styles.label}>Activity Level</label>
                  <select
                    name="activity"
                    value={formData.activity}
                    onChange={handleChange}
                    style={styles.input}
                  >
                    <option value="low">Low Activity</option>
                    <option value="moderate">Moderate Activity</option>
                    <option value="high">High Activity</option>
                  </select>
                </div>
              </div>

              <div style={styles.formColumn}>
                <div style={styles.formRow}>
                  <label style={styles.label}>Weight Goal</label>
                  <select
                    name="goal"
                    value={formData.goal}
                    onChange={handleChange}
                    style={styles.input}
                  >
                    <option value="">Select Goal</option>
                    <option value="gain">Gain Weight</option>
                    <option value="lose">Lose Weight</option>
                    <option value="maintain">Maintain Weight</option>
                  </select>
                </div>

                <div style={styles.formRow}>
                  <label style={styles.label}>Latitude</label>
                  <input
                    type="number"
                    name="userLat"
                    value={formData.userLat}
                    onChange={handleChange}
                    style={styles.input}
                  />
                </div>

                <div style={styles.formRow}>
                  <label style={styles.label}>Longitude</label>
                  <input
                    type="number"
                    name="userLon"
                    value={formData.userLon}
                    onChange={handleChange}
                    style={styles.input}
                  />
                </div>

                <div style={styles.formRow}>
                  <label style={styles.label}>Preferred Food</label>
                  <input
                    type="text"
                    name="preferredFood"
                    value={formData.preferredFood}
                    onChange={handleChange}
                    style={styles.input}
                    placeholder="e.g. Chicken, Salmon, Pasta..."
                  />
                </div>
              </div>
            </div>

            {/* Allergies and Restrictions Row */}
            <div style={styles.extraRow}>

              <div style={{ flex: 1, position: "relative" }}>
                <label style={styles.label}>Allergies</label>
                <button
                  type="button"
                  onClick={() => setShowAllergens(!showAllergens)}
                  style={{
                    ...styles.input,
                    textAlign: "left",
                    width: "100%",
                    cursor: "pointer",
                    marginTop: "0.5rem",
                  }}
                >
                  {formData.allergies.length > 0
                    ? formData.allergies.join(", ")
                    : "Select Allergies"}
                </button>
                {showAllergens && (
                  <div style={styles.allergyDropdown}>
                    {ALLERGEN_OPTIONS.map((option) => (
                      <label
                        key={option}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          marginBottom: "0.5rem",
                          color: "#ccc",
                        }}
                      >
                        <input
                          type="checkbox"
                          value={option}
                          checked={formData.allergies.includes(option)}
                          onChange={handleCheckboxChange}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              style={styles.button}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor =
                  styles.buttonHover.backgroundColor;
                (e.currentTarget as HTMLElement).style.transform =
                  styles.buttonHover.transform;
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = styles.button.backgroundColor!;
                (e.currentTarget as HTMLElement).style.transform = "none";
              }}
            >
              Update Profile
            </button>
          </form>

          {/* ----- Generate Meal Plan Button ----- */}
          <div style={{ maxWidth: "1000px", margin: "2rem auto", textAlign: "center" }}>
            <button
              onClick={handleGenerateMealPlan}
              disabled={mealPlanLoading}
              style={styles.button}
              onMouseOver={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor =
                  styles.buttonHover.backgroundColor;
                (e.currentTarget as HTMLElement).style.transform =
                  styles.buttonHover.transform;
              }}
              onMouseOut={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = styles.button.backgroundColor!;
                (e.currentTarget as HTMLElement).style.transform = "none";
              }}
            >
              {mealPlanLoading ? "Generating Meal Plan..." : "Generate Meal Plan"}
            </button>
          </div>

          {/* ----- Meal Plan Output ----- */}
          {parsedMeals.length > 0 && (
            <div style={styles.mealPlanContainer}>
              <h2 style={{ textAlign: "center", marginBottom: "1rem", color: "#CEB888" }}>
                Your Meal Plan
              </h2>

              {parsedMeals.map((mealItem) => (
                <div key={mealItem.meal} style={styles.mealCard}>
                  <h3 style={styles.mealTitle}>
                    {mealItem.meal} @ {mealItem.diningHall}
                  </h3>
                  <div>
                    {mealItem.foods.map((food) => {
                      const uniqueKey = `${mealItem.meal}-${mealItem.diningHall}-${food}`;
                      const expanded = expandedFoods[uniqueKey] || false;
                      const fData = getFoodData(food);

                      // If protein is missing or "?", show "Protein not found"
                      let proteinLabel = "";
                      if (!fData || !fData.protein || fData.protein === null) {
                        proteinLabel = "Protein not found";
                      } else {
                        proteinLabel = `${fData.protein}g protein`;
                      }

                      return (
                        <div key={uniqueKey} style={styles.foodItem}>
                          <div
                            style={styles.foodHeader}
                            onClick={() => toggleExpand(uniqueKey)}
                          >
                            <p style={{ margin: 0, fontWeight: "bold", color: "#CEB888" }}>
                              {food}
                            </p>
                            {/* Right-side info (Calories, Protein) */}
                            {fData ? (
                              <p style={styles.foodOverview}>
                                {fData.calorie || "?"} cal, {proteinLabel}
                              </p>
                            ) : (
                              <p style={styles.foodOverview}>
                                <em style={{ color: "#888" }}>No data found</em>
                              </p>
                            )}
                            <span style={styles.caret}>
                              {expanded ? "▼" : "▶"}
                            </span>
                          </div>

                          {/* Expandable content */}
                          {expanded && fData && (
                            <div style={styles.collapseContent}>
                              {fData.ingredients && (
                                <p style={styles.foodDetail}>
                                  <strong>Ingredients:</strong> {fData.ingredients}
                                </p>
                              )}
                              {fData.allergens && (
                                <p style={styles.foodDetail}>
                                  <strong>Allergens:</strong> {fData.allergens}
                                </p>
                              )}
                            </div>
                          )}

                          {expanded && !fData && (
                            <p style={{ marginLeft: "1rem", color: "#888" }}>
                              <em>There is no additional data available.</em>
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Animations and extra styles */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

// ---------- Allergen Options ----------
const ALLERGEN_OPTIONS = [
  "Eggs",
  "Milk",
  "Vegetarian",
  "Gluten",
  "Soy",
  "Wheat",
  "Vegan",
  "Sesame",
  "Coconut",
  "Tree nuts",
  "Peanuts",
];

// ---------- Styles ----------
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    minHeight: "100vh",
    fontFamily: "Segoe UI, sans-serif",
    background: "linear-gradient(135deg, #000000 0%, #333333 100%)",
    animation: "fadeIn 1s ease-in",
  },
  header: {
    backgroundColor: "#000000",
    padding: "1rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 1px 4px rgba(0, 0, 0, 0.5)",
    zIndex: 1,
    borderBottom: "3px solid #CEB888",
  },
  title: {
    fontSize: "1.5rem",
    fontWeight: 700,
    color: "#CEB888",
  },
  mainHeading: {
    fontSize: "2.2rem",
    fontWeight: "bold",
    color: "#CEB888",
  },
  subTitle: {
    color: "#ccc",
    marginBottom: "0.5rem",
  },
  card: {
    backgroundColor: "#000000",
    borderRadius: "1rem",
    padding: "2rem",
    maxWidth: "1000px",
    margin: "0 auto",
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
    animation: "slideUp 0.8s ease-out",
  },
  twoColumnGrid: {
    display: "flex",
    gap: "2rem",
    marginBottom: "1.5rem",
  },
  formColumn: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  formRow: {
    display: "flex",
    flexDirection: "column",
  },
  extraRow: {
    display: "flex",
    gap: "1rem",
    marginBottom: "1rem",
  },
  label: {
    fontSize: "0.9rem",
    color: "#ccc",
    marginBottom: "0.5rem",
  },
  input: {
    backgroundColor: "#1a1a1a",
    color: "#fff",
    border: "1px solid #444",
    borderRadius: "0.5rem",
    padding: "0.75rem",
    transition: "border 0.3s ease",
  },
  button: {
    marginTop: "1rem",
    width: "100%",
    backgroundColor: "#CEB888",
    color: "#000",
    fontWeight: "bold",
    padding: "0.85rem",
    borderRadius: "0.75rem",
    border: "none",
    cursor: "pointer",
    fontSize: "1rem",
    transition: "background-color 0.3s ease, transform 0.2s ease",
  },
  buttonHover: {
    backgroundColor: "#B8A571",
    transform: "scale(1.02)",
  },
  signOutButton: {
    backgroundColor: "#CEB888",
    color: "#000",
    fontWeight: "bold",
    padding: "0.5rem 1rem",
    borderRadius: "0.75rem",
    border: "none",
    cursor: "pointer",
    fontSize: "0.9rem",
    transition: "background-color 0.3s ease, transform 0.2s ease",
  },
  allergyDropdown: {
    position: "absolute",
    backgroundColor: "#000000",
    border: "1px solid #444",
    borderRadius: "0.5rem",
    padding: "1rem",
    marginTop: "0.5rem",
    zIndex: 10,
    width: "100%",
    maxHeight: "200px",
    overflowY: "auto",
  },
  mealPlanContainer: {
    maxWidth: "1000px",
    margin: "2rem auto",
    backgroundColor: "#000000",
    padding: "1rem",
    borderRadius: "0.75rem",
    boxShadow: "0 5px 20px rgba(0,0,0,0.5)",
    animation: "fadeIn 1s ease-in",
  },
  mealCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: "0.5rem",
    margin: "1rem 0",
    padding: "1rem",
    boxShadow: "0 3px 10px rgba(0,0,0,0.3)",
  },
  mealTitle: {
    fontSize: "1.2rem",
    color: "#CEB888",
    marginBottom: "0.5rem",
  },
  foodItem: {
    marginBottom: "1rem",
    borderBottom: "1px solid #333",
    paddingBottom: "0.5rem",
  },
  foodHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    cursor: "pointer",
  },
  foodOverview: {
    margin: 0,
    color: "#ccc",
    fontSize: "0.9rem",
    marginLeft: "1rem",
  },
  caret: {
    color: "#CEB888",
    fontWeight: "bold",
    marginLeft: "1rem",
  },
  collapseContent: {
    marginLeft: "1rem",
    marginTop: "0.5rem",
    paddingLeft: "0.5rem",
    borderLeft: "2px solid #CEB888",
    animation: "fadeIn 0.5s",
  },
  foodDetail: {
    margin: "0.25rem 0",
    color: "#ccc",
    fontSize: "0.9rem",
  },
};
