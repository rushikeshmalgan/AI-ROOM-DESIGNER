import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Farro } from "next/font/google";
import Provider from "./provider";

const outfit = Farro({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400"], // ✅ must specify at least one
});

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${outfit.variable} antialiased`}>
          <Provider>{children}</Provider>
        </body>
      </html>
    </ClerkProvider>
  );
}
