import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CATARA — Digital Assessment Platform",
  description:
    "CATARA adalah platform ujian digital berbasis teknologi yang membantu lembaga pendidikan, bimbingan belajar, dan penyelenggara seleksi mengelola ujian secara terstruktur, efisien, dan terukur.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CATARA",
  },
  icons: {
    icon: "/logourlbar.png",
    shortcut: "/logourlbar.png",
    apple: "/logoiconinstallmobile.png",
  },
  openGraph: {
    title: "CATARA — Digital Assessment Platform",
    description:
      "CATARA adalah platform ujian digital berbasis teknologi yang membantu lembaga pendidikan, bimbingan belajar, dan penyelenggara seleksi mengelola ujian secara terstruktur, efisien, dan terukur.",
    type: "website",
    images: [
      {
        url: "/logoiconinstallmobile.png",
        width: 512,
        height: 512,
        alt: "CATARA — Digital Assessment Platform",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "CATARA — Digital Assessment Platform",
    description:
      "CATARA adalah platform ujian digital berbasis teknologi yang membantu lembaga pendidikan, bimbingan belajar, dan penyelenggara seleksi mengelola ujian secara terstruktur, efisien, dan terukur.",
    images: ["/logoiconinstallmobile.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={inter.variable} suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="min-h-screen bg-[#f5f8ff] text-[#0c0c13] antialiased"
      >
        {children}
      </body>
    </html>
  );
}
