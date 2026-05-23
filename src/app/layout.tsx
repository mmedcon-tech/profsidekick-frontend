import type { Metadata } from "next";
import "./globals.css";
import "@/lib/envSetup";
import { AuthProvider } from "@/contexts/AuthContext";
import ConditionalHeader from "@/components/layout/ConditionalHeader";

export const metadata: Metadata = {
  title: "ProfSidekick",
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
    <html lang="en">
      <body className={`antialiased`}>
        <AuthProvider>
          <ConditionalHeader />
          <main>
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
