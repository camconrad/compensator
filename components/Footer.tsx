"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Sun, Moon } from "lucide-react";
import { useSettingTheme, useSettingActions } from "@/store/setting/selector";

export default function Footer() {
  const theme = useSettingTheme();
  const { updateTheme } = useSettingActions();

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    updateTheme(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem("compensatorTheme", newTheme);
    }
  };

  return (
    <motion.footer
      className="mt-[46px] md:mt-[60px] px-4 font-sans mx-auto max-w-[1100px] pb-3 flex gap-2 flex-wrap items-center justify-between text-[13px] text-[#6D7C8D]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3, duration: 0.2 }}
    >
      <div className="w-full border-t border-[#dde0e0] dark:border-[#232F3B] mb-2" />

      <div className="flex gap-4 items-center font-medium">
        <span>© 2025 Compound</span>
        <Link
          href="/terms"
          className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          Terms
        </Link>
        <Link
          href="/privacy"
          className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          Privacy
        </Link>
        {/* <Link
          href="https://github.com/camconrad/compensator"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          GitHub
        </Link> */}
        <Link
          href="https://docs.compensator.io"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          Docs
        </Link>
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
  );
}