import type { Metadata } from "next";
import "./globals.css";
import SessionProvider from "@/components/providers/SessionProvider";
import ThemeProvider from "@/components/providers/ThemeProvider";
import { DarkModeProvider } from "@/components/providers/DarkModeProvider";
import { SidebarRefreshProvider } from "@/components/providers/SidebarRefreshProvider";
import { Poppins } from "next/font/google";

const poppins = Poppins({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Decidoo - Prise de décision collaborative",
  description: "Application de gestion de décisions pour organisations",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${poppins.variable} antialiased`} suppressHydrationWarning>
        <DarkModeProvider>
          <ThemeProvider>
            <SessionProvider>
              <SidebarRefreshProvider>
                {children}
              </SidebarRefreshProvider>
            </SessionProvider>
          </ThemeProvider>
        </DarkModeProvider>
      </body>
    </html>
  );
}
