import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "לימוד קריאה",
  description: "אפליקציה ללימוד קריאה",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Default to RTL for Hebrew
  const direction = "rtl";

  return (
    <html lang="he" dir={direction}>
      <body className={inter.className}>{children}</body>
    </html>
  );
}

