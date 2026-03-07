import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { CallNotificationHandler } from "@/components/calling/call-notification-handler";
import { IncomingCallBanner } from "@/components/calling/incoming-call-banner";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import "@/styles/globals.css";

/** Inline script to prevent flash-of-wrong-theme on page load.
 *  Runs synchronously before React hydrates.
 *  SECURITY: This is a static string — never inject dynamic/user content here. */
const THEME_INIT_SCRIPT = `(function(){try{if(localStorage.getItem("ensurance-theme")==="dark"){document.documentElement.classList.add("dark")}}catch{}})();`;

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          />
        </head>
        <body
          className={`${inter.variable} ${geistMono.variable} antialiased`}
        >
          <ThemeProvider>
            {children}
            <IncomingCallBanner />
            <CallNotificationHandler />
            <Toaster position="bottom-right" />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
