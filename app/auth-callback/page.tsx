"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import supabase from "../lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      // 1) Check if user is logged in
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        // Not logged in => go back to login
        router.push("/login");
        return;
      }

      const user = session.user;

      // 2) Check if there's a 'profiles' row for this user
      const { data: existingProfile, error, status } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      // If there's an error we can't handle easily, just log & redirect
      if (error && status !== 406) {
        // 406 is 'No data returned' which might be normal if no row
        console.error("Error checking profile:", error.message);
        router.push("/login");
        return;
      }

      // 3) If no existing profile, create a row => direct them to /setup
      if (!existingProfile) {
        const { error: insertError } = await supabase
          .from("profiles")
          .insert({ user_id: user.id });

        if (insertError) {
          console.error("Error creating profile:", insertError.message);
          // Fallback, send them to main page or show error
          router.push("/");
          return;
        }
        router.push("/dashboard");
      } else {
        // If user already has a profile => go to main page
        router.push("/");
      }
    })();
  }, [router]);

  return (
    <p style={{ textAlign: "center", marginTop: "3rem", fontFamily: "sans-serif" }}>
      Processing your login or signup...
    </p>
  );
}
