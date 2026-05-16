import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AEX Polymarket Dashboard",
  description: "Agent Exchange Polymarket trading agent monitoring dashboard",
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
