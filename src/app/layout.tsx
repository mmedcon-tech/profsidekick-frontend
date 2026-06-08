import type { Metadata } from "next";
import "./globals.css";
import "@/lib/envSetup";
import { AuthProvider } from "@/contexts/AuthContext";
import { SearchProvider } from "@/contexts/SearchContext";
import ConditionalHeader from "@/components/layout/ConditionalHeader";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "MyOS",
  description: "Interactive AI-powered presentations for professors",
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors">
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
