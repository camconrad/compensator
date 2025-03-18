// app/terms/page.tsx

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
            <h1 className="text-3xl font-bold text-[#030303] dark:text-white mb-6">
              Terms of Service
            </h1>

            <div className="prose dark:prose-dark font-medium text-[#6D7C8D]">
              <p>
                Welcome to Compensator! These Terms of Service ("Terms") govern
                your use of the Compensator website and services ("Services")
                provided by compensator.io. By accessing or using our Services, you
                agree to be bound by these Terms.
              </p>

              <h2>1. Acceptance of Terms</h2>
              <p>
                By using our Services, you agree to these Terms and our Privacy
                Policy. If you do not agree to these Terms, you may not use our
                Services.
              </p>

              <h2>2. Changes to Terms</h2>
              <p>
                We may modify these Terms at any time. We will notify you of any
                changes by posting the updated Terms on our website. Your
                continued use of the Services after the changes have been made
                constitutes your acceptance of the revised Terms.
              </p>

              <h2>3. Use of Services</h2>
              <p>
                You agree to use the Services only for lawful purposes and in
                accordance with these Terms. You are responsible for all
                activities that occur under your account.
              </p>

              <h2>4. Privacy</h2>
              <p>
                Your use of the Services is also governed by our Privacy Policy,
                which can be found <Link href="/privacy">here</Link>.
              </p>

              <h2>5. Limitation of Liability</h2>
              <p>
                Compensator.io shall not be liable for any indirect, incidental,
                special, consequential, or punitive damages, including without
                limitation, loss of profits, data, use, goodwill, or other
                intangible losses, resulting from your access to or use of or
                inability to access or use the Services.
              </p>

              <h2>6. Governing Law</h2>
              <p>
                These Terms shall be governed by and construed in accordance
                with the laws of the State of Delaware, without regard to its
                conflict of law provisions.
              </p>

              <h2>7. Contact Us</h2>
              <p>
                If you have any questions about these Terms, please contact us
                at <a href="mailto:support@compensator.io">support@compensator.io</a>.
              </p>
            </div>
          </div>
        </motion.main>
        <Footer />
      </div>
    </>
  );
}
