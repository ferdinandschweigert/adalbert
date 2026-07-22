import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import "./globals.css";

const sourceSans = Source_Sans_3({
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Adalbert — Kreuzen & Anki",
  description:
    "Staatsexamen-Altfragen kreuzen und Anki-Decks mit deutschen Erklärungen anreichern.",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png", sizes: "48x48" },
      { url: "/adalbert-mark.png", type: "image/png", sizes: "128x128" },
    ],
    apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="light">
      <body className={`antialiased ${sourceSans.className}`}>
        {children}
      </body>
    </html>
  );
}
