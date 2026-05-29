import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cetus Yield Agent Dashboard",
  description: "Live monitoring for AEX agents running on Cetus Protocol (Sui)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
