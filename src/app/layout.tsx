import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import { TooltipProvider } from "@/components/ui/tooltip";
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
  title: "Harbour — Household Finance",
  description: "A private view of your household cash flow, budgets and future position.",
  applicationName: "Harbour",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Harbour" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? (
          <ClerkProvider appearance={{ theme: shadcn }}>
            <TooltipProvider>{children}</TooltipProvider>
          </ClerkProvider>
        ) : (
          <TooltipProvider>{children}</TooltipProvider>
        )}
      </body>
    </html>
  );
}
