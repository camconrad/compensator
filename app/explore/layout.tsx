import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Explore Delegates | Compensator",
  description: "Explore and discover Compound delegates on the Compensator marketplace.",
  openGraph: {
    title: "Explore Delegates | Compensator",
    description: "Explore and discover Compound delegates on the Compensator marketplace.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Explore Delegates | Compensator",
    description: "Explore and discover Compound delegates on the Compensator marketplace.",
  },
}

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 