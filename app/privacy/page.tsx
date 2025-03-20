// app/privacy/page.tsx

"use client";

import Head from "next/head";
import Link from "next/link";
import { motion } from "framer-motion";
import Header from "@/components/MainLayout/Header";
import Footer from "@/components/Footer";
import { useSettingTheme } from "@/store/setting/selector";
import Headroom from "react-headroom";

export default function PrivacyPolicy() {
  const theme = useSettingTheme();

  return (
    <>
      <Head>
        <title>Privacy Policy | Compensator</title>
        <meta
          name="description"
          content="Privacy Policy for the Compound delegate marketplace."
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
            <h1 className="text-3xl font-bold text-[#030303] dark:text-white mb-6">
              Privacy Policy
            </h1>

            <div className="prose dark:prose-dark font-medium text-[#6D7C8D]">
              <p>
                Your privacy is important to us. This Privacy Policy explains how
                Compensator ("we," "us," or "our") collects, uses, and protects
                your personal information when you use our services
                ("Services").
              </p>

              <h2>1. Information We Collect</h2>
              <p>
                We may collect the following types of information when you use
                our Services:
              </p>
              <ul>
                <li>
                  <strong>Personal Information:</strong> Such as your wallet address when you connect your wallet.
                </li>
                <li>
                  <strong>Usage Data:</strong> Information including IP address, browser, and
                  pages visits.
                </li>
                <li>
                  <strong>Cookies:</strong> We don't currently use cookies to enhance your
                  experience.
                </li>
              </ul>

              <h2>2. How We Use Your Information</h2>
              <p>We use your information to provide and improve our Services, communicate with you about updates or support, analyze usage and trends to enhance user experience, and comply with legal obligations.</p>

              <h2>3. Sharing Your Information</h2>
              <p>
                We do not sell or share your personal information with third
                parties except in the following cases: With your consent, to comply with legal requirements or protect our rights, or with service providers who assist us in operating our Service.
              </p>

              <h2>4. Data Security</h2>
              <p>
                We take reasonable measures to protect your information from
                unauthorized access, disclosure, or misuse. However, no method of
                transmission over the internet is 100% secure.
              </p>

              <h2>5. Your Rights</h2>
              <p>
                You have the right to access, update, or delete your personal
                information. If you wish to exercise these rights, please contact
                us at <a href="mailto:support@compound.finance">support@compound.finance</a>.
              </p>

              <h2>6. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will
                notify you of any changes by posting the updated policy on our
                website. Your continued use of the Services after the changes
                have been made constitutes your acceptance of the revised policy.
              </p>

              <h2>7. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please
                contact us at{" "}
                <a href="mailto:support@compensator.io">support@compensator.io</a>.
              </p>
            </div>
          </div>
        </motion.main>
        <Footer />
      </div>
    </>
  );
}