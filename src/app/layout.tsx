import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "資産管理アプリ",
  description:
    "複数の証券会社の保有資産を一元管理するWEBアプリケーション",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
