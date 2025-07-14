"use client";

import type React from "react";
import Image from "next/image";
import Link from "next/link";
import authServices from "@/services/auth";
import { useEffect, useState, useRef } from "react";
import { useAccount } from "wagmi";
import ConnectWalletButton from "./ConnectWalletButton";
import httpClient from "@/services/httpClient";
import { useSelectedAccessToken, useSelectedAuthActions } from "@/store/auth/selector";
import NetworkDropdown from "./NetworkDropdown";
import { usePathname } from "next/navigation";
import { FaHome, FaCompass, FaUser, FaFileAlt } from "react-icons/fa";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

const Header = () => {
  const [isAtTop, setIsAtTop] = useState(true);
  const { setAddress, setAccessToken } = useSelectedAuthActions();
  const accessToken = useSelectedAccessToken();
  const pathname = usePathname();

  const { address } = useAccount();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  const navItems = [
    {
      name: "Home",
      href: "/",
      icon: <FaHome className="w-[14px] h-[14px] text-[#6D7D8E] mr-2" />,
    },
    {
      name: "Explore",
      href: "/explore",
      icon: <FaCompass className="w-[14px] h-[14px] text-[#6D7D8E] mr-2" />,
    },
    {
      name: "Profile",
      href: "/profile",
      icon: <FaUser className="w-[14px] h-[14px] text-[#6D7D8E] mr-2" />,
    },
    {
      name: "Docs",
      href: "https://docs.compensator.io",
      external: true,
      icon: <FaFileAlt className="w-[14px] h-[14px] text-[#6D7D8E] mr-2" />,
    },
  ];

  const handleLogin = async () => {
    try {
      const response = await authServices.login(address as string);
      httpClient.setAccessToken(response?.data?.access_token);
      setAddress(address as string);
      setAccessToken(response?.data?.access_token);
    } catch (error) {
      console.log("error :>> ", error);
    }
  };

  const handleGetProfile = async () => {
    try {
      const response = await authServices.getProfile(address as string);
      console.log("response :>> ", response);
    } catch (error) {
      console.log("error :>> ", error);
    }
  };

  useEffect(() => {
    if (address && isClient) {
      handleLogin();
    }
  }, [address, isClient]);

  useEffect(() => {
    if (accessToken && isClient) {
      handleGetProfile();
    }
  }, [accessToken, isClient]);

  useEffect(() => {
    const handleScroll = () => {
      setIsAtTop(window.scrollY === 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);

    return () => {
      window.removeEventListener("resize", checkIsMobile);
    };
  }, []);

  useEffect(() => {
    const currentPath = pathname;

    if (currentPath === "/privacy" || currentPath === "/terms" || currentPath.startsWith("/delegate/")) {
      setHoveredTab(null);
      return;
    }

    const activeItem = navItems.find((item) => item.href === currentPath);
    if (activeItem) {
      setHoveredTab(activeItem.name);
    } else {
      if (currentPath.startsWith("/explore")) setHoveredTab("Explore");
      else if (currentPath.startsWith("/profile")) setHoveredTab("Profile");
      else setHoveredTab("Home");
    }
  }, [pathname]);

  useEffect(() => {
    if (!navRef.current || !indicatorRef.current || !hoveredTab) return;

    const navElement = navRef.current;
    const indicator = indicatorRef.current;

    const activeTabElement = navElement.querySelector(`[data-name="${hoveredTab}"]`) as HTMLElement;

    if (activeTabElement) {
      const tabRect = activeTabElement.getBoundingClientRect();
      const navRect = navElement.getBoundingClientRect();

      indicator.style.width = `${tabRect.width}px`;
      indicator.style.height = `${tabRect.height}px`;
      indicator.style.transform = `translateX(${tabRect.left - navRect.left}px)`;
    }
  }, [hoveredTab]);

  return (
    <header className="inset-x-0 left-0 top-0 w-full bg-[#EFF2F5] dark:bg-[#0D131A] backdrop-blur-lg">
        <div className="flex items-center justify-between w-full px-4 max-w-[1100px] py-3 mx-auto">
          <div className="flex items-center justify-start">
            <Link href="/" className="mr-4">
              <div className="w-auto flex items-center gap-2">
                <Image src="/icon.png" alt="Compound icon" width={24} height={24} className="mb-1" />
                <div className="">
                  <h1 className="text-xl font-bold text-[#030303] dark:text-white">Compensator</h1>
                </div>
              </div>
            </Link>

            <div className="hidden md:block relative">
              <nav ref={navRef} className="flex items-center relative">
                <div
                  ref={indicatorRef}
                  className="absolute rounded-full dark:bg-[#1D2833] bg-[#D7DFE4] transition-all duration-200 ease-in-out z-0"
                />

                {navItems.map((item) =>
                  item.external ? (
                    <a
                      key={item.name}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-name={item.name}
                      className={`px-3 py-1 rounded-full text-sm font-semibold relative z-10 transition-colors duration-200 flex items-center
                        ${hoveredTab === item.name ? "text-[#17212B] dark:text-white" : "dark:text-white text-[#17212B]"}`}
                      onMouseEnter={() => setHoveredTab(item.name)}
                      onMouseLeave={() =>
                        setHoveredTab(
                          pathname === "/"
                            ? "Home"
                            : pathname === "/explore"
                              ? "Explore"
                              : pathname === "/profile"
                                ? "Profile"
                                : "Home",
                        )
                      }
                    >
                      {item.icon}
                      {item.name}
                    </a>
                  ) : (
                    <Link
                      key={item.name}
                      href={item.href}
                      data-name={item.name}
                      className={`px-3 py-1 rounded-full text-sm font-semibold relative z-10 transition-colors duration-200 flex items-center
                        ${hoveredTab === item.name ? "text-[#17212B] dark:text-white" : "dark:text-white text-[#17212B]"}`}
                      onMouseEnter={() => setHoveredTab(item.name)}
                      onMouseLeave={() =>
                        setHoveredTab(
                          pathname === "/"
                            ? "Home"
                            : pathname === "/explore"
                              ? "Explore"
                              : pathname === "/profile"
                                ? "Profile"
                                : "Home",
                        )
                      }
                    >
                      {item.icon}
                      {item.name}
                    </Link>
                  ),
                )}
              </nav>
            </div>
          </div>

          <div className="flex items-center justify-en gap-3">
            <div className="hidden md:block">
              <NetworkDropdown />
            </div>
            <div className="">
              {isClient && <ConnectWalletButton isMobile={isMobile} />}
            </div>
            <div className="md:hidden flex items-center">
              <MobileNavigation navItems={navItems} currentPath={pathname} />
            </div>
          </div>
        </div>
      </header>
  );
};

const MobileNavigation = ({
  navItems,
  currentPath,
}: {
  navItems: { name: string; href: string; external?: boolean; icon: React.ReactNode }[];
  currentPath: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full bg-[#D8DFE5] dark:bg-[#1D2833] text-[#17212B] dark:text-white flex items-center justify-center w-10 h-10 relative"
        aria-label={isOpen ? "Close menu" : "Open menu"}
      >
        <div className="w-5 h-5 relative flex items-center justify-center">
          <span
            className={`absolute h-0.5 w-3 bg-current transform transition-all duration-300 ease-in-out ${
              isOpen ? "rotate-45" : "translate-y-[-4px]"
            }`}
          />
          <span
            className={`absolute h-0.5 w-3 bg-current transition-all duration-300 ease-in-out ${
              isOpen ? "opacity-0" : "opacity-100"
            }`}
          />
          <span
            className={`absolute h-0.5 w-3 bg-current transform transition-all duration-300 ease-in-out ${
              isOpen ? "-rotate-45" : "translate-y-[4px]"
            }`}
          />
        </div>
      </button>
      {isOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-[#EFF2F5] dark:bg-[#0D131A] z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col gap-4 p-4 pt-20">
                {navItems.map((item) =>
                  item.external ? (
                    <a
                      key={item.name}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center px-2 py-1 text-3xl font-semibold ${currentPath === item.href ? " text-white dark:text-white" : "text-[#17212B] dark:text-white"}`}
                      onClick={() => setIsOpen(false)}
                    >
                      {item.name}
                    </a>
                  ) : (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center px-2 py-1 text-3xl font-semibold ${currentPath === item.href ? "text-[#10B981] dark:text-white" : "text-[#17212B] dark:text-white"}`}
                      onClick={() => setIsOpen(false)}
                    >
                      {item.name}
                    </Link>
                  ),
                )}
              </div>
            </motion.div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default Header
