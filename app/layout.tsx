import type { Metadata } from "next";
import { Inter, Frank_Ruhl_Libre } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });
const frankRuhlLibre = Frank_Ruhl_Libre({ 
  subsets: ["latin", "hebrew"],
  weight: ["300", "400", "500", "700", "900"],
  variable: "--font-frank-ruhl-libre",
});

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
      <body className={`${inter.className} ${frankRuhlLibre.variable}`}>
        <Header />
        {children}
        <Toaster />
      </body>
    </html>
  );
}

