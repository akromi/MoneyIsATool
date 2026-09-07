import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Money Is a Tool — Book & Teacher Resources",
  description: "Buy the digital edition of Money Is a Tool, or license it for your school with Teacher Resources.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
