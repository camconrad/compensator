import { Providers } from "./providers";
import "./globals.css";
import { Metadata } from "next";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Home | Compensator",
  description: "Access the Compound delegate marketplace.",
  openGraph: {
    title: "Home | Compensator",
    description: "Access the Compound delegate marketplace.",
    type: "website",
    images: "/twitter-image.png",
  },
  twitter: {
    card: "summary",
    title: "Home | Compensator",
    description: "Access the Compound delegate marketplace.",
    images: "/twitter-image.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Toaster />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
