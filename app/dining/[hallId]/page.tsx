// app/dining/[hallId]/page.tsx

interface DiningHallPageProps {
    params: {
      hallId: string;
    };
  }
  
  export default function DiningHallPage({ params }: DiningHallPageProps) {
    const { hallId } = params;
  
    return (
      <main style={styles.main}>
        <h1 style={styles.heading}>Dining Hall: {hallId}</h1>
        <p style={styles.paragraph}>
          Here you can show details like recommended menu items, location,
          AI-driven health suggestions, etc.
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
      padding: '2rem',
      fontFamily: 'sans-serif',
    },
    heading: {
      fontSize: '2rem',
      marginBottom: '1rem',
    },
    paragraph: {
      marginBottom: '2rem',
      maxWidth: '600px',
      lineHeight: 1.5,
      textAlign: 'center',
    },
  };
  