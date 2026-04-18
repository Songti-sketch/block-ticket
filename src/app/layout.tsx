import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Block Ticket - Anti-Scalping MVP",
  description:
    "A delivery-ready ticket resale demo with virtual accounts, a 110% anti-scalping cap, and synchronized frontend and back-office views.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
