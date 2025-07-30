// app/page.tsx

"use client";

import { useEffect } from "react";
import Header from "@/components/MainLayout/Header";
import HeroBanner from "@/components/HeroBanner";
import Delegates from "@/components/Delegates";
import Proposals from "@/components/Proposals";
import Analytics from "@/components/Analytics";
import Footer from "@/components/Footer";
import { useSettingActions, useSettingTheme } from "@/store/setting/selector";
import Headroom from "react-headroom";

export const dynamic = 'force-dynamic';

export default function Home() {
  const theme = useSettingTheme();
  const { updateTheme } = useSettingActions();

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  return (
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

      <section className="pt-3 pb-3">
        <HeroBanner />
      </section>

      <section className="pt-1 pb-1 relative z-1">
        <Delegates />
      </section>

      <section className="pt-1 pb-1 relative z-1">
        <Proposals />
      </section>

      <section className="pt-1 pb-1 relative z-1">
        <Analytics />
      </section>

      <section className="pt-1 pb-1 relative z-1">
        <Footer />
      </section>
    </div>
  );
}