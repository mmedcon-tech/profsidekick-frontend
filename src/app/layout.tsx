import type { Metadata } from "next";
import "./globals.css";
import "@/lib/envSetup";
import { AuthProvider } from "@/contexts/AuthContext";
import { SearchProvider } from "@/contexts/SearchContext";
import ConditionalHeader from "@/components/layout/ConditionalHeader";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "MyOS — Expert AI Platform",
  description: "Knowledge-based AI avatars that let experts scale. Expert digital twins for education.",
  icons: {
    icon: [
      {
        url: '/images/logo.png',
        type: 'image/png',
      }
    ],
    apple: [
      {
        url: '/images/logo.png',
        type: 'image/png',
      }
    ],
  },
  openGraph: {
    title: "MyOS — Expert AI Platform",
    description: "Knowledge-based AI avatars that let experts scale.",
    images: [{ url: '/images/logo.png' }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <body className="antialiased transition-colors">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <SearchProvider>
              <ConditionalHeader />
              <main>
                {children}
              </main>
            </SearchProvider>
          </AuthProvider>
          <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{
              duration: 4000,
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
