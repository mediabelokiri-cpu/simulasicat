import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Simulasi CAT Prima RIB — CPNS, Sekdin & Polri",
  description:
    "Platform ujian simulasi berbasis Computer Assisted Test (CAT) resmi untuk peserta bimbingan belajar Prima RIB dan institusi mitra.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Prima RIB CAT",
  },
  icons: {
    icon: "/logo1.png",
    apple: "/logo1.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="min-h-screen bg-[#fcfbf7] text-[#151515] antialiased">
        {children}
      </body>
    </html>
  );
}
