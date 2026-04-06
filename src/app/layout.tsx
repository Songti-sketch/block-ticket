import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Block Ticket - Anti-Scalping MVP",
  description: "A Web3 MVP for capped NFT ticket resales with a 110% anti-scalping rule.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#050816] text-white">
        {children}
      </body>
    </html>
  );
}
