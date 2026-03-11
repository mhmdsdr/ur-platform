import type { Metadata } from "next";
import { Cairo } from "next/font/google"; // Changed font
import "./globals.css";
import MainLayout from "@/components/MainLayout";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "منصة اور العالمية",
  description: "منصة اور العالمية - استثمار وتداول مالي آمن ومميز.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body
        className={`${cairo.variable} font-sans antialiased`}
      >
        <MainLayout>{children}</MainLayout>
      </body>
    </html>
  );
}
