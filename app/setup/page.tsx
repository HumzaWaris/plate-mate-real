"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "../lib/supabase";

// Editable lists
const AVAILABLE_SCHOOLS = ["Purdue", "UIUC", "Stanford", "Other"];
const AVAILABLE_ALLERGIES = ["Gluten", "Dairy", "Vegetarian", "Peanuts"];

export default function SetupPage() {
  const router = useRouter();

  // Form state
  const [school, setSchool] = useState<string>("");
  const [dietaryPreferences, setDietaryPreferences] = useState<string>("");
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);

  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Ensure user is logged in
  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
      }
    })();
  }, [router]);

  // Toggle logic for allergy checkboxes
  const handleToggleAllergy = (value: string) => {
    if (selectedAllergies.includes(value)) {
      setSelectedAllergies((prev) => prev.filter((r) => r !== value));
    } else {
      setSelectedAllergies((prev) => [...prev, value]);
    }
  };

  // Save to Supabase
  const handleSave = async () => {
    setStatusMsg(null);
    setErrorMsg(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        setErrorMsg("No user session found. Please log in again.");
        return;
      }

      // Make sure 'dietary_preferences' is a TEXT column in DB, not text[]
      // 'allergies' can be text[] for multiple selections.
      const { error } = await supabase
        .from("profiles")
        .update({
          school,                       // text
          dietary_preferences: dietaryPreferences, // text
          allergies: selectedAllergies, // text[] in the DB
        })
        .eq("user_id", session.user.id);

      if (error) {
        throw error;
      }

      setStatusMsg("Profile updated successfully!");
      setTimeout(() => {
        router.push("/");
      }, 500);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  return (
    <main style={styles.main}>
      <h1>Setup Your Profile</h1>
      <p style={styles.paragraph}>
        Select or enter your info below. Feel free to update it later.
      </p>

      {errorMsg && <p style={{ color: "red" }}>{errorMsg}</p>}
      {statusMsg && <p style={{ color: "green" }}>{statusMsg}</p>}

      {/* ========== School (Dropdown) ========== */}
      <div style={styles.formSection}>
        <label style={styles.label}>School</label>
        <select
          style={styles.select}
          value={school}
          onChange={(e) => setSchool(e.target.value)}
        >
          <option value="">-- Select a School --</option>
          {AVAILABLE_SCHOOLS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* ========== Dietary Preferences (Text) ========== */}
      <div style={styles.formSection}>
        <label style={styles.label}>Dietary Preferences</label>
        <input
          type="text"
          style={styles.input}
          value={dietaryPreferences}
          onChange={(e) => setDietaryPreferences(e.target.value)}
          placeholder='e.g., "Halal", "Kosher", etc.'
        />
      </div>

      {/* ========== Allergies (CheckBoxes) ========== */}
      <div style={styles.formSection}>
        <label style={styles.label}>Allergies</label>
        <div style={styles.checkboxGroup}>
          {AVAILABLE_ALLERGIES.map((item) => (
            <label key={item} style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={selectedAllergies.includes(item)}
                onChange={() => handleToggleAllergy(item)}
              />
              {item}
            </label>
          ))}
        </div>
      </div>

      <button style={styles.button} onClick={handleSave}>
        Save
      </button>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    width: "80%",
    maxWidth: "600px",
    margin: "2rem auto",
    fontFamily: "sans-serif",
  },
  paragraph: {
    marginBottom: "1rem",
  },
  formSection: {
    marginBottom: "1rem",
  },
  label: {
    display: "block",
    marginBottom: "0.25rem",
    fontWeight: "bold",
  },
  select: {
    width: "100%",
    padding: "0.5rem",
    fontSize: "1rem",
  },
  input: {
    width: "100%",
    padding: "0.5rem",
    fontSize: "1rem",
  },
  checkboxGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.3rem",
    marginTop: "0.5rem",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  button: {
    marginTop: "1rem",
    padding: "0.75rem 1rem",
    fontSize: "1rem",
    fontWeight: "bold",
    cursor: "pointer",
  },
};
