import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AEX Sui Portfolio Rebalancer Dashboard",
  description: "Agent Exchange Sui portfolio rebalancer monitoring dashboard — SUI/USDC on Sui",
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
