import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Profile | Compensator",
  description: "Manage your Compound governance profile and delegations on Compensator.",
  openGraph: {
    title: "Profile | Compensator",
    description: "Manage your Compound governance profile and delegations on Compensator.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Profile | Compensator",
    description: "Manage your Compound governance profile and delegations on Compensator.",
  },
}

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
} 