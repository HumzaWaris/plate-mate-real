"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "./lib/supabase";

interface Profile {
  restrictions?: string; // or string[] if you store arrays
  allergies?: string;    // or string[] if you store arrays
}

export default function HomePage() {
  const router = useRouter();

  // --------------------------
  // 1) Hooks: State + Effects
  // --------------------------
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch session + profile data
  useEffect(() => {
    const fetchData = async () => {
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

      // Fetch the user's profile
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

  // If user is logged in and has a profile, redirect to /dashboard
  useEffect(() => {
    if (!loading && session && profile) {
      router.push("/dashboard");
    }
  }, [loading, session, profile, router]);

  // Sign out function
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    router.push("/");
  };

  // --------------------------
  // 2) Conditional Rendering
  // --------------------------
  if (loading) {
    return <p style={styles.loading}>Loading...</p>;
  }

  // ========== NOT LOGGED IN ==========
  if (!session) {
    return (
      <main style={styles.main}>
        <div style={styles.card}>
          <h1 style={styles.welcome}>Welcome to PlateMate!</h1>
          <p style={styles.slogan}>
            Your personal partner in nutrition & meal planning.
          </p>
          <p style={styles.authors}>
            Created by Humza W., Anay P., Utsav A., Aditya V.
          </p>
          <div style={styles.buttonRow}>
            <button style={styles.button} onClick={() => router.push("/login")}>
              Sign In
            </button>
            <button style={styles.button} onClick={() => router.push("/signup")}>
              Sign Up
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ========== LOGGED IN BUT NO PROFILE ==========
  if (!profile) {
    return (
      <main style={styles.main}>
        <div style={styles.card}>
          <h2 style={styles.title}>No profile data found</h2>
          <p style={styles.paragraph}>Please finish your setup.</p>
          <button style={styles.button} onClick={() => router.push("/dashboard")}>
            Go to Setup
          </button>
          <hr style={styles.hr} />
          <button style={styles.button} onClick={handleSignOut}>
            Sign Out
          </button>
        </div>
      </main>
    );
  }

  // ========== LOGGED IN AND HAVE PROFILE ==========
  // By this point, useEffect has already pushed to /dashboard
  return null;
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #000000 0%, #333333 100%)",
    fontFamily: "Segoe UI, sans-serif",
    padding: "2rem",
    animation: "fadeIn 1s ease-in",
  },
  card: {
    backgroundColor: "#000000",
    padding: "2rem",
    borderRadius: "1rem",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
    textAlign: "center",
    maxWidth: "500px",
    width: "100%",
    color: "#ccc",
    animation: "slideUp 0.8s ease-out",
  },
  welcome: {
    fontSize: "2.5rem",
    color: "#CEB888",
    marginBottom: "0.5rem",
  },
  slogan: {
    fontSize: "1.2rem",
    color: "#ccc",
    marginBottom: "1rem",
  },
  authors: {
    fontSize: "0.9rem",
    color: "#aaa",
    marginBottom: "1.5rem",
  },
  title: {
    fontSize: "2rem",
    color: "#CEB888",
    marginBottom: "1rem",
  },
  paragraph: {
    fontSize: "1.1rem",
    lineHeight: 1.5,
    marginBottom: "1.5rem",
  },
  buttonRow: {
    display: "flex",
    justifyContent: "center",
    gap: "1rem",
    flexWrap: "wrap",
  },
  button: {
    backgroundColor: "#CEB888",
    color: "#000",
    fontWeight: "bold",
    padding: "0.75rem 1.5rem",
    border: "none",
    borderRadius: "0.5rem",
    cursor: "pointer",
    fontSize: "1rem",
    transition: "background-color 0.3s ease, transform 0.2s ease",
  },
  hr: {
    border: "none",
    borderTop: "1px solid #444",
    margin: "2rem 0",
  },
  loading: {
    marginTop: "2rem",
    textAlign: "center",
    fontFamily: "sans-serif",
  },
};

/* Global styles for animations */
if (typeof window !== "undefined") {
  const style = document.createElement("style");
  style.innerHTML = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideUp {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    button:hover {
      background-color: #B8A571 !important;
      transform: scale(1.02);
    }
  `;
  document.head.appendChild(style);
}
