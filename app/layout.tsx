import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Decido - Prise de décision collaborative",
  description: "Application de gestion de décisions pour organisations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
