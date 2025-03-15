"use client";

import authServices from "@/services/auth";
import { motion } from "framer-motion";
import { BarChart2, BookOpen, Compass, Menu, MessageCircle, Star, User, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import ConnectWalletButton from "./ConnectWalletButton";
import SearchBar from "./SearchBar";
import httpClient from "@/services/httpClient";
import { useSelectedAccessToken, useSelectedAuthActions } from "@/store/auth/selector";
import NetworkDropdown from "./NetworkDropdown";

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);
  const { setAddress, setAccessToken } = useSelectedAuthActions();
  const accessToken = useSelectedAccessToken()

  const { address } = useAccount();

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
      console.log('response :>> ', response);
    } catch (error) {
      console.log("error :>> ", error);
    }
  }

  useEffect(() => {
    if (address) {
      handleLogin();
    }
  }, [address, handleLogin]);

  useEffect(() => {
    if(accessToken) { 
      handleGetProfile();
    }
  }, [accessToken, handleGetProfile]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleScroll = () => {
      setIsAtTop(window.scrollY === 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <>
      <header
        className={`inset-x-0 left-0 top-0 z-[100] w-full transition-colors duration-200 ${
          isAtTop ? "bg-transparent" : "bg-[#EFF2F5]/80 backdrop-blur-lg dark:bg-[#0D131A]/90"
        }`}
      >
        <div className="flex items-center justify-between w-full px-4 max-w-[1100px] py-3 mx-auto">
          <div className="flex items-center justify-start">
            <Link href="/" className="mr-4">
              <div className="w-auto flex items-center gap-2">
                <Image
                  src="/icon.png"
                  alt="Compensator logo"
                  width={24}
                  height={24}
                  className="mb-1"
                />
                <div className="hidden sm:inline-block">
                  <h1 className="text-xl font-bold text-[#030303] dark:text-white">
                    Compensator
                  </h1>
                </div>
              </div>
            </Link>
          </div>
          <div className="hidden lg:flex justify-center flex-grow">
            <SearchBar />
          </div>
          <div className="hidden lg:flex items-center space-x-3">
            <NetworkDropdown />
            <div className="flex items-center space-x-4">
              <ConnectWalletButton />
            </div>
          </div>
          <div className="flex items-center space-x-1 lg:hidden">
            {!isOpen && <ConnectWalletButton />}
            <button onClick={() => setIsOpen(!isOpen)} className="pl-2" aria-label="Toggle menu">
              <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
                {isOpen ? <X size={24} /> : <Menu size={24} />}
              </motion.div>
            </button>
          </div>
        </div>
      </header>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
        onClick={() => setIsOpen(false)}
        style={{ pointerEvents: isOpen ? "auto" : "none" }}
      />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: isOpen ? "0%" : "100%" }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
        className="fixed top-0 right-0 z-50 w-4/5 h-full bg-white dark:bg-[#0e0e0e] lg:hidden"
      >
        <div className="flex flex-col h-full p-6">
          <div className="flex justify-end mb-6">
            <button onClick={() => setIsOpen(false)} className="p-2" aria-label="Close menu">
              <X size={24} />
            </button>
          </div>

          <div className="mb-6">
            <SearchBar />
          </div>

          <nav className="flex flex-col space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Link
                href="/profile"
                className="flex items-center text-lg font-medium text-[#595959] dark:text-[#868686]"
                onClick={() => setIsOpen(false)}
              >
                <User className="w-5 h-5 mr-2" /> Profile
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Link
                href="/points"
                className="flex items-center text-lg font-medium text-[#595959] dark:text-[#868686]"
                onClick={() => setIsOpen(false)}
              >
                <Star className="w-5 h-5 mr-2" /> Points
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Link
                href="/analytics"
                className="flex items-center text-lg font-medium text-[#595959] dark:text-[#868686]"
                onClick={() => setIsOpen(false)}
              >
                <BarChart2 className="w-5 h-5 mr-2" /> Analytics
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Link
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-lg font-medium text-[#595959] dark:text-[#868686]"
                onClick={() => setIsOpen(false)}
              >
                <MessageCircle className="w-5 h-5 mr-2" /> Support
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Link
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-lg font-medium text-[#595959] dark:text-[#868686]"
                onClick={() => setIsOpen(false)}
              >
                <BookOpen className="w-5 h-5 mr-2" /> Docs
              </Link>
            </motion.div>
          </nav>

          <div className="mt-auto">
            <ConnectWalletButton />
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default Header;
