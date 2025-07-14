import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Service | Compensator",
  description: "Terms of Service for the Compound delegate marketplace.",
  openGraph: {
    title: "Terms of Service | Compensator",
    description: "Terms of Service for the Compound delegate marketplace.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Terms of Service | Compensator",
    description: "Terms of Service for the Compound delegate marketplace.",
  },
}

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 