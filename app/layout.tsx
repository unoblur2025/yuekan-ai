import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "阅槛 AI｜先读懂门槛，再跨过门槛",
  description: "为非科班同学打造的 AI 岗位门槛识别器",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
