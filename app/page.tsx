"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "./lib/supabase";

interface Profile {
  restrictions?: string; // or string[] if you store arrays
  allergies?: string;          // or string[] if you store arrays
}

export default function HomePage() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // 1) Check if user is logged in
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        // Not logged in
        setSession(null);
        setLoading(false);
        return;
      }

      setSession(session);

      // 2) Fetch the user's profile data
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("restrictions, allergies")
        .eq("user_id", session.user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error.message);
      }

      setProfile(profileData);
      setLoading(false);
    };

    fetchData();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    router.push("/");
  };

  if (loading) {
    return <p style={styles.loading}>Loading...</p>;
  }

  // ========== NOT LOGGED IN ==========
  if (!session) {
    return (
      <main style={styles.main}>
        <h1>Welcome!</h1>
        <p>You are not signed in.</p>
        <button style={styles.button} onClick={() => router.push("/login")}>
          Sign In
        </button>
        <button style={styles.button} onClick={() => router.push("/signup")}>
          Sign Up
        </button>
      </main>
    );
  }

  // ========== LOGGED IN BUT NO PROFILE ==========
  if (!profile) {
    return (
      <main style={styles.main}>
        <h2>No profile data found</h2>
        <p>Please finish your setup.</p>
        <button style={styles.button} onClick={() => router.push("/dashboard")}>
          Go to Setup
        </button>

        {/* Sign Out option for convenience */}
        <hr style={{ margin: "2rem 0" }} />
        <button style={styles.button} onClick={handleSignOut}>
          Sign Out
        </button>
      </main>
    );
  }

  // ========== LOGGED IN AND HAVE PROFILE ==========
  return (
    <main style={styles.main}>
      <h1>Welcome to the Dining App</h1>
      <p style={styles.paragraph}>
        Below is some information from your profile. You can use these details
        for personalized dining recommendations or other features in your project.
      </p>

      <div style={styles.profileContainer}>
        <div style={styles.profileItem}>
          <strong>School:</strong> {profile.school || "N/A"}
        </div>
        <div style={styles.profileItem}>
          <strong>Dietary Preferences:</strong>{" "}
          {profile.dietary_preferences || "None specified"}
        </div>
        <div style={styles.profileItem}>
          <strong>Allergies:</strong> {profile.allergies || "None specified"}
        </div>
      </div>

      <button style={styles.button} onClick={() => router.push("/setup")}>
        Update Profile
      </button>

      <hr style={{ margin: "2rem 0" }} />
      <button style={styles.button} onClick={handleSignOut}>
        Sign Out
      </button>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginTop: "3rem",
    fontFamily: "sans-serif",
  },
  loading: {
    marginTop: "2rem",
    textAlign: "center",
    fontFamily: "sans-serif",
  },
  paragraph: {
    maxWidth: "600px",
    textAlign: "center",
    marginBottom: "1rem",
  },
  profileContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    marginBottom: "1rem",
  },
  profileItem: {
    fontSize: "1.1rem",
  },
  button: {
    margin: "0.5rem",
    padding: "0.75rem 1rem",
    fontWeight: "bold",
    cursor: "pointer",
  },
};
