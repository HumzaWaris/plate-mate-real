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

    // If successful, go to /auth-callback
    router.push("/auth-callback");
  };

  // --- Google OAuth Login ---
  const handleGoogleLogin = async () => {
    setErrorMsg(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_REDIRECT_URL}/auth-callback`,
      },
    });

    if (error) {
      setErrorMsg(error.message);
    }
    // On success, user is redirected to Google => then back to /auth-callback
  };

  return (
    <main style={styles.main}>
      <h1 style={styles.heading}>Login</h1>
      {errorMsg && <p style={{ color: "red" }}>{errorMsg}</p>}

      <div style={styles.field}>
        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
        />
      </div>

      <div style={styles.field}>
        <label>Password</label>
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

      <hr style={{ margin: "2rem 0" }} />

      <button onClick={handleGoogleLogin} style={styles.button}>
        Sign In with Google
      </button>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    maxWidth: "400px",
    margin: "0 auto",
    marginTop: "5rem",
    fontFamily: "sans-serif",
  },
  heading: {
    fontSize: "1.8rem",
    marginBottom: "0.5rem",
  },
  field: {
    display: "flex",
    flexDirection: "column",
  },
  input: {
    padding: "0.5rem",
    fontSize: "1rem",
  },
  button: {
    padding: "0.75rem",
    fontSize: "1rem",
    fontWeight: "bold",
    cursor: "pointer",
  },
};
