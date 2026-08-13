import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { ScreenTimeTracker } from "@/components/ScreenTimeTracker";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Axiora — Enterprise Task Management System",
  description: "High-performance enterprise task & operational workflow portal for Axiora Software.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} antialiased`}>
      <body className="bg-[#FAFAF9] text-stone-900 font-sans min-h-screen selection:bg-blue-100 selection:text-blue-900">
        <ScreenTimeTracker />
        {children}
      </body>
    </html>
  );
}
