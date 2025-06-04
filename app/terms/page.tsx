"use client";

import Head from "next/head";
import Link from "next/link";
import { motion } from "framer-motion";
import Header from "@/components/MainLayout/Header";
import Footer from "@/components/Footer";
import { useSettingTheme } from "@/store/setting/selector";
import Headroom from "react-headroom";

export default function TermsOfService() {
  const theme = useSettingTheme();

  return (
    <>
      <Head>
        <title>Terms of Service | Compensator</title>
        <meta
          name="description"
          content="Terms of Service for the Compound delegate marketplace."
        />
      </Head>

      <div className="min-h-screen bg-[#EFF2F5] dark:bg-[#0D131A]">
        <div className="relative z-50">
          <Headroom
            style={{
              overflowX: "hidden",
            }}
          >
            <Header />
          </Headroom>
        </div>

        <motion.main
          className="flex flex-col items-center justify-center min-h-screen p-8 sm:p-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="max-w-2xl w-full">
            <h1 className="text-4xl font-bold text-[#030303] dark:text-white mb-4">
              Terms of Service
            </h1>

            <div className="prose dark:prose-dark font-medium text-[#6D7C8D] space-y-6 max-w-none">
              {/* Introduction */}
              <div>
                <p className="text-lg">
                  Welcome to Compensator! These Terms of Service ("Terms") govern
                  your use of the Compensator website and services ("Services")
                  provided by compensator.io, a non-custodial delegate marketplace for the Compound protocol. By accessing or using our Services, you
                  agree to be bound by these Terms.
                </p>
              </div>

              {/* Section 1 */}
              <div>
                <h2 className="text-2xl font-bold text-[#030303] dark:text-white mb-3">
                  1. Acceptance of Terms
                </h2>
                <p>
                  By using our Services, you agree to these Terms and our Privacy
                  Policy. If you do not agree to these Terms, you may not use our
                  Services. Compensator provides a platform for users to incentivize delegation, earn rewards, and stake COMP for and against proposals, all in a non-custodial manner.
                </p>
              </div>

              {/* Section 2 */}
              <div>
                <h2 className="text-2xl font-bold text-[#030303] dark:text-white mb-3">
                  2. Changes to Terms
                </h2>
                <p>
                  We may modify these Terms at any time. We will notify you of any
                  changes by posting the updated Terms on our website. Your
                  continued use of the Services after the changes have been made
                  constitutes your acceptance of the revised Terms. As the Compound governance ecosystem evolves, these Terms may be updated to reflect new features and services.
                </p>
              </div>

              {/* Section 3 */}
              <div>
                <h2 className="text-2xl font-bold text-[#030303] dark:text-white mb-3">
                  3. Use of Services
                </h2>
                <p>
                  You agree to use the Services only for lawful purposes and in
                  accordance with these Terms. You are responsible for all
                  activities that occur under your account. Our Services allow you to:
                </p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Incentivize delegation of COMP voting power</li>
                  <li>Earn rewards for delegating your COMP</li>
                  <li>Stake COMP for and against governance proposals</li>
                  <li>Participate in Compound governance in a non-custodial manner</li>
                </ul>
              </div>

              {/* Section 4 */}
              <div>
                <h2 className="text-2xl font-bold text-[#030303] dark:text-white mb-3">
                  4. Non-Custodial Services
                </h2>
                <p>
                  Compensator is a non-custodial platform. This means:
                </p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>We never take custody of your COMP tokens</li>
                  <li>You maintain full control of your assets at all times</li>
                  <li>All delegation and staking actions are performed through smart contracts on the blockchain</li>
                  <li>You are responsible for securing your wallet and private keys</li>
                </ul>
              </div>

              {/* Section 5 */}
              <div>
                <h2 className="text-2xl font-bold text-[#030303] dark:text-white mb-3">
                  5. Privacy
                </h2>
                <p>
                  Your use of the Services is governed by our Privacy Policy,
                  found{" "}
                  <Link href="/privacy" className="text-[#11D48E] hover:underline">
                    here
                  </Link>. While blockchain transactions are public by nature, we respect your privacy regarding any off-chain data we may collect.
                </p>
              </div>

              {/* Section 6 */}
              <div>
                <h2 className="text-2xl font-bold text-[#030303] dark:text-white mb-3">
                  6. Risks and Disclaimers
                </h2>
                <p>
                  Participation in blockchain-based governance systems involves inherent risks:
                </p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Smart contract risks and potential vulnerabilities</li>
                  <li>Volatility in token values</li>
                  <li>Regulatory uncertainty in various jurisdictions</li>
                  <li>Changes to the Compound protocol that may affect our Services</li>
                </ul>
                <p className="mt-2">
                  You acknowledge these risks when using our platform.
                </p>
              </div>

              {/* Section 7 */}
              <div>
                <h2 className="text-2xl font-bold text-[#030303] dark:text-white mb-3">
                  7. Limitation of Liability
                </h2>
                <p>
                  Compensator.io shall not be liable for any indirect, incidental,
                  special, consequential, or punitive damages, including without
                  limitation, loss of profits, data, use, goodwill, or other
                  intangible losses, resulting from your access to or use of or
                  inability to access or use the Services. This includes any losses resulting from:
                </p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Smart contract failures or exploits</li>
                  <li>Decisions made by Compound governance</li>
                  <li>Changes to the Compound protocol</li>
                  <li>Your own actions in delegating or staking COMP</li>
                </ul>
              </div>

              {/* Section 8 */}
              <div>
                <h2 className="text-2xl font-bold text-[#030303] dark:text-white mb-3">
                  8. Governing Law
                </h2>
                <p>
                  These Terms shall be governed by and construed in accordance
                  with the laws of the State of Delaware, without regard to its
                  conflict of law provisions.
                </p>
              </div>

              {/* Section 9 */}
              <div>
                <h2 className="text-2xl font-bold text-[#030303] dark:text-white mb-3">
                  9. Contact Us
                </h2>
                <p>
                  If you have any questions about these Terms, our delegate marketplace, or how to participate in Compound governance through our platform, please contact us
                  at{" "}
                  <a 
                    href="mailto:support@compensator.io"
                    className="text-[#11D48E] hover:underline"
                  >
                    support@compensator.io
                  </a>.
                </p>
              </div>
            </div>
          </div>
        </motion.main>
        <Footer />
      </div>
    </>
  );
}

