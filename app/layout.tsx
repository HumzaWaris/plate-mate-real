// app/layout.tsx
import { ReactNode } from 'react';

export const metadata = {
  title: 'BiteWise',
  description: 'AI-based Campus Dining Recommendations',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
