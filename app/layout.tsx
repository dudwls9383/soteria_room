import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PICKTRACK — 음악 이상형 월드컵",
  description: "유튜브 재생목록으로 음악 이상형 월드컵을 만들고, 나의 우승곡과 전체 인기 랭킹을 확인하세요.",
  other: {
    "codex-preview": "development",
  },
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
