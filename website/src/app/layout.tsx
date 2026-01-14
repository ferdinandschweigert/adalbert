import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Adalbert - Anki MCP Server",
  description: "AI-powered Anki card enrichment with German explanations. Organize decks, manage tags, and enhance your flashcards with intelligent features.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
