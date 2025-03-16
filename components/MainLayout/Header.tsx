"use client";

import authServices from "@/services/auth";
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
  const [isAtTop, setIsAtTop] = useState(true);
  const { setAddress, setAccessToken } = useSelectedAuthActions();
  const accessToken = useSelectedAccessToken();

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
  };

  useEffect(() => {
    if (address) {
      handleLogin();
    }
  }, [address]);

  useEffect(() => {
    if (accessToken) {
      handleGetProfile();
    }
  }, [accessToken]);

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
    <header className="inset-x-0 left-0 top-0 w-full transition-colors duration-200 bg-[#EFF2F5]/80 backdrop-blur-lg dark:bg-[#0D131A]/90">
      <div className="flex items-center justify-between w-full px-4 max-w-[1100px] py-3 mx-auto">
        <div className="flex items-center justify-start">
          <Link href="/" className="mr-4">
            <div className="w-auto flex items-center gap-2">
              <Image
                src="/icon.png"
                alt="Compound icon"
                width={24}
                height={24}
                className="mb-1"
              />
              <div className="">
                <h1 className="text-xl font-bold text-[#030303] dark:text-white">
                  Compensator
                </h1>
              </div>
            </div>
          </Link>
        </div>
        <div className="hidden md:flex justify-center flex-grow">
          <SearchBar />
        </div>
        <div className="flex items-center justify-end space-x-3 md:space-x-4">
          <div className="">
            <NetworkDropdown />
          </div>
          <div className="">
            <ConnectWalletButton />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header
