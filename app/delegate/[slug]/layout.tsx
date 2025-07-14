import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Delegate | Compensator",
  description: "View delegate details and manage your Compound governance delegations.",
  openGraph: {
    title: "Delegate | Compensator",
    description: "View delegate details and manage your Compound governance delegations.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Delegate | Compensator",
    description: "View delegate details and manage your Compound governance delegations.",
  },
}

export default function DelegateSlugLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 