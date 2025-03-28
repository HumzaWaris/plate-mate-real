// app/page.tsx
import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={styles.main}>
      <h1 style={styles.heading}>Welcome to PlateMate</h1>
      <p style={styles.paragraph}>
        Discover healthy and sustainable dining hall options around campus.
      </p>
      <div style={styles.linkContainer}>
        <Link href="/dining/hall-1" style={styles.link}>
          Dining Hall #1
        </Link>
        <Link href="/dining/hall-2" style={styles.link}>
          Dining Hall #2
        </Link>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    fontFamily: 'sans-serif',
  },
  heading: {
    fontSize: '2rem',
    marginBottom: '1rem',
  },
  paragraph: {
    marginBottom: '2rem',
    textAlign: 'center',
    maxWidth: '600px',
    lineHeight: 1.5,
  },
  linkContainer: {
    display: 'flex',
    gap: '1rem',
  },
  link: {
    textDecoration: 'none',
    fontWeight: 'bold',
    padding: '0.5rem 1rem',
    border: '1px solid #333',
    borderRadius: '4px',
  },
};
