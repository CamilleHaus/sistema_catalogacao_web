import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/components/auth-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Sistema de Catalogação",
    template: "%s | Sistema de Catalogação",
  },
  description: "Gestão segura de projetos e acervos empresariais.",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "var(--surface)",
              color: "var(--foreground)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-xl)",
              boxShadow: "var(--shadow-md)",
              fontFamily: "var(--font-geist-sans), Arial, Helvetica, sans-serif",
              fontSize: "0.875rem",
            },
            success: {
              iconTheme: {
                primary: "var(--color-success-600)",
                secondary: "var(--surface)",
              },
            },
            error: {
              iconTheme: {
                primary: "var(--color-danger-600)",
                secondary: "var(--surface)",
              },
            },
          }}
        />
      </body>
    </html>
  );
}
