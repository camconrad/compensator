"use client";

import { useState, useEffect, FormEvent } from "react";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import Header from "@/components/MainLayout/Header";
import HeroBanner from "@/components/HeroBanner";
import Delegates from "@/components/Delegates";
import Proposals from "@/components/Proposals";
import Analytics from "@/components/Analytics";
import { Sun, Moon } from "lucide-react";
import { useSettingActions, useSettingTheme } from "@/store/setting/selector";
import Headroom from "react-headroom";

export default function Home() {
  const [authorized, setAuthorized] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const theme = useSettingTheme();
  const { updateTheme } = useSettingActions();
  const correctPasscode = "2025";

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.2,
        when: "beforeChildren",
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.2 },
    },
  };

  useEffect(() => {
    const auth = localStorage.getItem("compensatorAuthorized");
    if (auth === "true") {
      setAuthorized(true);
    }
  }, []);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    updateTheme(newTheme);
    localStorage.setItem("compensatorTheme", newTheme);
  };

  const handlePasscodeSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      if (passcode === correctPasscode) {
        setAuthorized(true);
        localStorage.setItem("compensatorAuthorized", "true");
        setError("");
      } else {
        setError("Invalid passcode. Please try again.");
        setPasscode("");
      }
      setLoading(false);
    }, 600);
  };

  return (
    <>
      <Head>
        <title>Home | Compensator</title>
        <meta
          name="description"
          content="Access the Compound delegate marketplace."
        />
      </Head>

      <div className="min-h-screen bg-[#EFF2F5] dark:bg-[#0D131A]">
        {authorized ? (
          <>
            <Headroom>
              <Header />
            </Headroom>

            <section className="pt-3 pb-3">
              <HeroBanner />
            </section>

            <section className="">
              <Delegates />
            </section>

            <section className="">
              <Proposals />
            </section>

            <section className="">
              <Analytics />
            </section>

            <motion.footer
              className="mt-[64px] font-sans mx-auto max-w-[1100px] pb-3 flex gap-2 flex-wrap items-center justify-between text-[13px] text-gray-500 dark:text-gray-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.2 }}
            >
              <div className="w-full border-t border-gray-200 dark:border-[#232F3B] mb-2" />

              <div className="flex gap-4 items-center">
                <span>© 2025 Compound</span>
                <a
                  href="#"
                  className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  Terms
                </a>
                <a
                  href="#"
                  className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  Privacy
                </a>
                <a
                  href="https://github.com/camconrad/compensator"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                  GitHub
                </a>
              </div>

              <motion.button
                onClick={toggleTheme}
                className="text-xs p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
              </motion.button>
            </motion.footer>
          </>
        ) : (
          <motion.main
            className="flex flex-col items-center justify-center min-h-screen p-8 sm:p-20"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            key="login-view"
          >
            <motion.div
              className="flex flex-col items-center text-center mb-3 font-sans"
              variants={itemVariants}
            >
              <Link href="/" className="mx-auto">
                <div className="inline-block">
                  <Image
                    src={theme === "dark" ? "/logo.png" : "/logo-white.png"}
                    alt="Compensator Logo"
                    width={54}
                    height={54}
                    className="mx-auto rounded-lg"
                  />
                </div>
              </Link>
              <h1 className="mt-2 text-3xl font-bold text-[#030303] dark:text-white">
                Compensator
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Compound delegate marketplace
              </p>
            </motion.div>

            <motion.div
              className="w-full max-w-[360px]"
              variants={itemVariants}
            >
              <form
                onSubmit={handlePasscodeSubmit}
                className="flex flex-col gap-3 w-full font-sans"
              >
                <motion.div className="relative" variants={itemVariants}>
                  <div className="relative h-12">
                    <input
                      id="passcode"
                      type="password"
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      className="absolute inset-0 h-full p-3 px-4 rounded-lg w-full transition-all bg-white dark:bg-gray-800 dark:border-[#2e3746] border border-gray-200 text-[#030303] dark:text-white outline-none focus:border-emerald-300 dark:focus:border-emerald-700"
                      autoFocus
                    />
                    <label
                      htmlFor="passcode"
                      className={`absolute left-4 pointer-events-none transition-all duration-200 ${
                        isFocused || passcode
                          ? "text-xs text-emerald-500 dark:text-emerald-400 top-1"
                          : "text-sm text-gray-500 dark:text-gray-400 top-1/2 -translate-y-1/2"
                      }`}
                    >
                      Passcode
                    </label>
                  </div>
                </motion.div>

                {error && (
                  <motion.div
                    className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm flex items-start"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <svg
                      className="w-4 h-4 mt-0.5 mr-2 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      ></path>
                    </svg>
                    <div>{error}</div>
                  </motion.div>
                )}

                <motion.button
                  type="submit"
                  className={`${
                    loading
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-emerald-600"
                  } bg-emerald-500 text-white py-3 min-h-[50px] font-sans px-6 rounded-full font-semibold transition-colors flex justify-center items-center`}
                  disabled={loading}
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin mx-auto h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    </>
                  ) : (
                    "Unlock"
                  )}
                </motion.button>
              </form>
            </motion.div>

            <motion.div
              className="flex flex-col font-sans gap-2 mt-3 text-sm text-gray-500 dark:text-gray-400 max-w-xs text-center"
              variants={itemVariants}
            >
              <p>
                First time here? This is an invite-only beta. Please contact
                your Compound delegate for access.
              </p>
            </motion.div>
          </motion.main>
        )}
      </div>
    </>
  );
}
