import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SOTERIA ROOM — 나의 음악 보관실",
  description: "소테리아의 재생목록을 고르고, 음악을 찾고, 취향을 기록하는 공간.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
