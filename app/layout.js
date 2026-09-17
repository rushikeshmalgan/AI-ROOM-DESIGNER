import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import Provider from "./provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
          <Provider>
            <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
          </Provider>
        </body>
      </html>
    </ClerkProvider>
  );
}
