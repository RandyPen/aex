import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AEX Uniswap Rebalancer Dashboard",
  description: "Agent Exchange Uniswap v3 concentrated liquidity rebalancer monitoring dashboard",
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
