"use client";

import { useSettingTheme } from "@/store/setting/selector";
import { useEffect } from "react";

const ThemeProvider = () => {
  const theme = useSettingTheme();

  useEffect(() => {
    // document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
    if (theme === "light") {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    }
  }, [theme]);

  return <></>;
};

export default ThemeProvider;
