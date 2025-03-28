// app/not-found.tsx
export default function NotFoundPage() {
    return (
      <main style={styles.main}>
        <h1 style={styles.heading}>404 - Page Not Found</h1>
        <p style={styles.paragraph}>
          Oops! The page you are looking for does not exist.
        </p>
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
      fontFamily: 'sans-serif',
      textAlign: 'center',
      padding: '2rem',
    },
    heading: {
      fontSize: '2rem',
      marginBottom: '1rem',
    },
    paragraph: {
      fontSize: '1rem',
      maxWidth: '600px',
      lineHeight: 1.5,
    },
  };
  