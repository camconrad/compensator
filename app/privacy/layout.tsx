import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy | Compensator",
  description: "Privacy Policy for the Compound delegate marketplace.",
  openGraph: {
    title: "Privacy Policy | Compensator",
    description: "Privacy Policy for the Compound delegate marketplace.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Privacy Policy | Compensator",
    description: "Privacy Policy for the Compound delegate marketplace.",
  },
}

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 