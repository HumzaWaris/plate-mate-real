// app/dining/[hallId]/page.tsx
"use client";

import { useEffect, useState } from 'react';
import supabase from '@/app/lib/supabase';
import { useRouter, useParams } from 'next/navigation';

export default function DiningHallPage() {
  const router = useRouter();
  const params = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);

  const hallId = params?.hallId as string;

  useEffect(() => {
    // Check if user is authenticated
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        // Not logged in; redirect to /login
        router.push('/login');
      } else {
        setIsSignedIn(true);
      }
      setIsLoading(false);
    };

    checkSession();
  }, [router]);

  if (isLoading) {
    return <p>Loading...</p>;
  }

  if (!isSignedIn) {
    // This might never be seen if we redirect, but just in case
    return <p>Redirecting to login...</p>;
  }

  return (
    <main style={{ fontFamily: 'sans-serif', textAlign: 'center', marginTop: '5rem' }}>
      <h1>Dining Hall: {hallId}</h1>
      <p>Protected content: recommended menu items, location, etc.</p>
      <button
        onClick={async () => {
          await supabase.auth.signOut();
          router.push('/login');
        }}
      >
        Sign Out
      </button>
    </main>
  );
}
