// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs';
import { currentUser } from '@clerk/nextjs/server';
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from 'sonner'
import { ThemeWrapper } from '@/components/providers/theme-wrapper'
import { prisma } from '@/lib/db'

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "CommissionFlow - AI-Powered Sales Commission Management",
  description: "Simplify sales commission tracking, calculation, and payments with AI-powered tools for SMBs.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch user's theme preference from database
  let userTheme = 'system'
  try {
    const clerkUser = await currentUser()
    if (clerkUser) {
      const dbUser = await prisma.user.findUnique({
        where: { clerkId: clerkUser.id },
        select: { themePreference: true },
      })
      if (dbUser?.themePreference) {
        userTheme = dbUser.themePreference
      }
    }
  } catch (error) {
    // Ignore errors - user might not be signed in yet or database might not be ready
    console.log('Could not fetch user theme preference:', error)
  }

  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${inter.className} ${inter.variable}`}>
          <ThemeWrapper initialTheme={userTheme}>
            {children}
            <Toaster/>
            <SonnerToaster />
          </ThemeWrapper>
          <Analytics/>
          <SpeedInsights />
        </body>
      </html>
    </ClerkProvider>
  );
}
