import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SECRET GANG — Office RPG",
  description: "Browser multiplayer RPG for office teams",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
