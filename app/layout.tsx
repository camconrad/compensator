import { Geist, Geist_Mono } from "next/font/google";
import AppProvider from "../providers/AppProvider";
import ThemeProvider from "../providers/ThemeProvider";
import "./globals.css";
import { Metadata } from "next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'Home | Compensator',
  description: 'Access the Compound delegate marketplace.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider />
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
