"use client"

import Head from "next/head"
import { motion } from "framer-motion"
import Header from "@/components/MainLayout/Header"
import Footer from "@/components/Footer"
import { useSettingTheme } from "@/store/setting/selector"
import Headroom from "react-headroom"

export default function PrivacyPolicy() {
  const theme = useSettingTheme()

  return (
    <>
      <Head>
        <title>Privacy Policy | Compensator</title>
        <meta name="description" content="Privacy Policy for the Compound delegate marketplace." />
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
            <h1 className="text-4xl font-bold text-[#030303] dark:text-white mb-4">Privacy Policy</h1>

            <div className="prose dark:prose-dark font-medium text-[#6D7C8D] space-y-6 max-w-none">
              {/* Introduction */}
              <div>
                <p className="text-lg">
                  Your privacy is important to us. This Privacy Policy explains how Compensator ("we," "us," or "our")
                  collects, uses, and protects your personal information when you use our non-custodial delegate
                  marketplace for the Compound protocol ("Services").
                </p>
              </div>

              {/* Section 1 */}
              <div>
                <h2 className="text-2xl font-bold text-[#030303] dark:text-white mb-3">1. Information We Collect</h2>
                <p>We may collect the following types of information when you use our Services:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>
                    <strong>Blockchain Information:</strong> Public blockchain data such as your wallet address,
                    transaction history, and COMP token balances when you connect your wallet.
                  </li>
                  <li>
                    <strong>Delegation Data:</strong> Information about your delegation preferences, voting history, and
                    staking activities on the Compound protocol.
                  </li>
                  <li>
                    <strong>Usage Data:</strong> Information including IP address, browser type, device information, and
                    pages visited to improve our Services.
                  </li>
                  <li>
                    <strong>Cookies:</strong> We don't currently use cookies to enhance your experience.
                  </li>
                </ul>
              </div>

              {/* Section 2 */}
              <div>
                <h2 className="text-2xl font-bold text-[#030303] dark:text-white mb-3">
                  2. How We Use Your Information
                </h2>
                <p>We use your information to:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Provide and improve our non-custodial delegate marketplace</li>
                  <li>Facilitate delegation, rewards, and staking of COMP tokens</li>
                  <li>Display relevant information about Compound governance proposals</li>
                  <li>Communicate with you about updates, support, or responses to your inquiries</li>
                  <li>Analyze usage patterns and trends to enhance user experience</li>
                  <li>Comply with legal obligations and protect our rights</li>
                </ul>
              </div>

              {/* Section 3 */}
              <div>
                <h2 className="text-2xl font-bold text-[#030303] dark:text-white mb-3">3. Blockchain Data</h2>
                <p>Please be aware that blockchain technology is inherently transparent:</p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Transactions on the Ethereum blockchain are public and permanently recorded</li>
                  <li>
                    Your wallet address, balances, and activities are visible
                    onchain
                  </li>
                  <li>Our non-custodial design means you maintain control of your assets at all times</li>
                  <li>We cannot delete or modify information that exists on the blockchain</li>
                </ul>
              </div>

              {/* Section 4 */}
              <div>
                <h2 className="text-2xl font-bold text-[#030303] dark:text-white mb-3">4. Sharing Your Information</h2>
                <p>
                  We do not sell or share your personal information with third parties except in the following cases:
                </p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>With your explicit consent</li>
                  <li>To comply with legal requirements or protect our rights</li>
                  <li>With service providers who assist us in operating our Services</li>
                  <li>In connection with a merger, acquisition, or sale of assets (with appropriate protections)</li>
                </ul>
              </div>

              {/* Section 5 */}
              <div>
                <h2 className="text-2xl font-bold text-[#030303] dark:text-white mb-3">5. Data Security</h2>
                <p>
                  We take reasonable measures to protect your information from unauthorized access, disclosure, or
                  misuse. However, no method of transmission over the internet is 100% secure. We recommend that you:
                </p>
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>Use hardware wallets or secure wallet solutions</li>
                  <li>Never share your private keys or seed phrases</li>
                  <li>Verify all transaction details before signing</li>
                  <li>Use strong, unique passwords for any accounts associated with your crypto activities</li>
                </ul>
              </div>

              {/* Section 6 */}
              <div>
                <h2 className="text-2xl font-bold text-[#030303] dark:text-white mb-3">6. Your Rights</h2>
                <p>
                  You have the right to access, update, or delete your personal information that is not stored on the
                  blockchain. If you wish to exercise these rights, please contact us at{" "}
                  <a href="mailto:support@compensator.io" className="text-[#11D48E] hover:underline">
                    support@compensator.io
                  </a>
                  .
                </p>
              </div>

              {/* Section 7 */}
              <div>
                <h2 className="text-2xl font-bold text-[#030303] dark:text-white mb-3">7. Changes to This Policy</h2>
                <p>
                  We may update this Privacy Policy from time to time. We will notify you of any changes by posting the
                  updated policy on our website. Your continued use of the Services after the changes have been made
                  constitutes your acceptance of the revised policy. As the Compound governance ecosystem evolves, this
                  Policy may be updated to reflect new features and services.
                </p>
              </div>

              {/* Section 8 */}
              <div>
                <h2 className="text-2xl font-bold text-[#030303] dark:text-white mb-3">8. Contact Us</h2>
                <p>
                  If you have any questions about this Privacy Policy, our delegate marketplace, or how we handle your
                  data, please contact us at{" "}
                  <a href="mailto:support@compensator.io" className="text-[#11D48E] hover:underline">
                    support@compensator.io
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>
        </motion.main>
        <Footer />
      </div>
    </>
  )
}
