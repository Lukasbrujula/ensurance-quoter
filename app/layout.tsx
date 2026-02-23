import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { CallNotificationHandler } from "@/components/calling/call-notification-handler";
import { IncomingCallBanner } from "@/components/calling/incoming-call-banner";
import { AuthProvider } from "@/components/auth/auth-provider";
import { getCurrentUser } from "@/lib/supabase/auth-server";
import "@/styles/globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "My Insurance Quoter — The Command Center for Insurance Agents",
  description:
    "The high-velocity quoting portal for insurance agents. Quote Term, Final Expense, IUL, and Annuities side-by-side during live consultations.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body
        className={`${inter.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider initialUser={user}>
          {children}
        </AuthProvider>
        <IncomingCallBanner />
        <CallNotificationHandler />
        <Toaster position="bottom-right" theme="light" />
      </body>
    </html>
  );
}
