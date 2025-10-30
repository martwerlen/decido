import type { Metadata } from "next";
import "./globals.css";
import SessionProvider from "@/components/providers/SessionProvider";
import ThemeProvider from "@/components/providers/ThemeProvider";
import { SidebarRefreshProvider } from "@/components/providers/SidebarRefreshProvider";

export const metadata: Metadata = {
  title: "Decidoo - Prise de décision collaborative",
  description: "Application de gestion de décisions pour organisations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <SessionProvider>
            <SidebarRefreshProvider>
              {children}
            </SidebarRefreshProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
