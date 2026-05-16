import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AEX Recurring Payments Dashboard",
  description: "Agent Exchange recurring payments agent monitoring dashboard",
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
