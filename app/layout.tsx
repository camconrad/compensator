import AppProvider from "../providers/AppProvider";
import ThemeProvider from "../providers/ThemeProvider";
import "./globals.css";
import { Metadata } from "next";

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
      <body className="antialiased">
        <ThemeProvider />
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
