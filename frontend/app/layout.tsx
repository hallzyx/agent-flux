import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent Flux — Reference Implementation",
  description: "From client brief to execution-ready PRD via a supervised Flux Cycle",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
