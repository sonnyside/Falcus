import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Falcus",
  description: "Din makker til næste lille skridt",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="da">
      <body>{children}</body>
    </html>
  );
}