"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import supabase from "../lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const router = useRouter();

  // --- Email/Password Login ---
  const handleLogin = async () => {
    setErrorMsg(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    // If successful, go to dashboard
    router.push("/dashboard");
  };

  // --- Google OAuth Login ---
  const handleGoogleLogin = async () => {
    setErrorMsg(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_REDIRECT_URL}/dashboard`,
      },
    });

    if (error) {
      setErrorMsg(error.message);
    }
    // On success, user is redirected via Google OAuth
  };

  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <h1 style={styles.heading}>Login</h1>
        {errorMsg && <p style={styles.error}>{errorMsg}</p>}

        <div style={styles.field}>
          <label style={styles.label}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />
        </div>

        <button onClick={handleLogin} style={styles.button}>
          Sign In
        </button>

        <hr style={styles.hr} />

        <button onClick={handleGoogleLogin} style={styles.button}>
          Sign In with Google
        </button>
      </div>
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
    </main>
  );
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
    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
    textAlign: "center",
    maxWidth: "400px",
    width: "100%",
    animation: "slideUp 0.8s ease-out",
  },
  heading: {
    fontSize: "2rem",
    color: "#CEB888",
    marginBottom: "1rem",
  },
  error: {
    color: "red",
    marginBottom: "1rem",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    textAlign: "left",
    marginBottom: "1rem",
  },
  label: {
    marginBottom: "0.5rem",
    color: "#ccc",
    fontSize: "0.9rem",
  },
  input: {
    padding: "0.75rem",
    fontSize: "1rem",
    borderRadius: "0.5rem",
    border: "1px solid #444",
    backgroundColor: "#1a1a1a",
    color: "#fff",
    outline: "none",
  },
  button: {
    padding: "0.75rem",
    fontSize: "1rem",
    fontWeight: "bold",
    cursor: "pointer",
    borderRadius: "0.5rem",
    border: "none",
    backgroundColor: "#CEB888",
    color: "#000",
    marginTop: "1rem",
    transition: "background-color 0.3s ease, transform 0.2s ease",
    width: "100%",
  },
  hr: {
    margin: "2rem 0",
    border: "none",
    borderTop: "1px solid #444",
  },
};
