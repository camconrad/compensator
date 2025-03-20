"use client";

import Head from "next/head";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/MainLayout/Header";
import Footer from "@/components/Footer";
import { useSettingTheme } from "@/store/setting/selector";
import Headroom from "react-headroom";
import {
  TrendingUp,
  Users,
  AlertCircle,
  Wallet,
  WandSparkles,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import ConnectWalletButton from "@/components/MainLayout/ConnectWalletButton";
import Modal from "@/components/common/Modal";
import { useGetCompensatorContract } from "@/hooks/useGetCompensatorContract";
import { getEthersSigner } from "@/hooks/useEtherProvider";
import { wagmiConfig } from "@/providers/WagmiRainbowKitProvider";
import { switchChain, waitForTransactionReceipt } from "@wagmi/core";
import toast from "react-hot-toast";
import { mainnet } from "wagmi/chains";

interface UserProfile {
  name: string;
  address: string;
  image: string;
  bio: string;
  votingPower: string;
  totalDelegations: number;
  activeDelegations: number;
}

interface Delegation {
  delegate: string;
  delegateImage: string;
  amount: string;
  date: string;
}

interface Proposal {
  title: string;
  status: string;
  date: string;
  votesFor: number;
  votesAgainst: number;
  voted: boolean;
  voteDirection: "for" | "against" | null;
}

export default function ProfilePage() {
  const theme = useSettingTheme();
  const { address, isConnected } = useAccount();

  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(true);
  const [isDelegationsLoading, setIsDelegationsLoading] =
    useState<boolean>(true);
  const [isProposalsLoading, setIsProposalsLoading] = useState<boolean>(true);
  const [isRewardsModalOpen, setIsRewardsModalOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [profileName, setProfileName] = useState<string>("");
  const [delegateAddress, setDelegateAddress] = useState<string>("");
  const [apr, setApr] = useState<string>(""); // APR input
  const [fundingAmount, setFundingAmount] = useState<string>("");
  const [isFocused, setIsFocused] = useState(false);
  const [modalKey, setModalKey] = useState<number>(Date.now()); // Unique key for modal
  const { compensatorContract } = useGetCompensatorContract();
  const { switchChainAsync } = useSwitchChain();

  const loadAllData = useCallback(async () => {
    try {
      await Promise.all([
        fetchProfileData(),
        fetchDelegations(),
        fetchProposals(),
      ]);
    } catch (error) {
      console.error("Error loading data:", error);
      setIsError(true);
      setErrorMessage("Failed to load profile data. Please try again.");
    }
  }, []);

  useEffect(() => {
    if (isConnected && address) {
      loadAllData();
    } else {
      setIsProfileLoading(false);
      setIsDelegationsLoading(false);
      setIsProposalsLoading(false);
      setProfile(null);
      setDelegations([]);
      setProposals([]);
    }
  }, [isConnected, address, loadAllData]);

  const fetchProfileData = async () => {
    setIsProfileLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setProfile({
        name: "Username",
        address: address
          ? `${address.substring(0, 6)}...${address.substring(
              address.length - 4
            )}`
          : "0x1234...5678",
        image: "/logo.png",
        bio: "Bio goes here",
        votingPower: "0.00 COMP",
        totalDelegations: 0,
        activeDelegations: 0,
      });
      setIsProfileLoading(false);
    } catch (error) {
      setIsError(true);
      setErrorMessage("Failed to load profile data. Try again.");
      setIsProfileLoading(false);
    }
  };

  const fetchDelegations = async () => {
    setIsDelegationsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setDelegations([
        {
          delegate: "Geoffrey Hayes",
          delegateImage: "/delegates/geoffrey-hayes.jpg",
          amount: "500 COMP",
          date: "Feb 28th, 2025",
        },
        {
          delegate: "a16z",
          delegateImage: "/delegates/a16z.jpg",
          amount: "300 COMP",
          date: "Mar 5th, 2025",
        },
      ]);
      setIsDelegationsLoading(false);
    } catch (error) {
      setIsError(true);
      setErrorMessage("Failed to load delegations. Please try again.");
      setIsDelegationsLoading(false);
    }
  };

  const fetchProposals = async () => {
    setIsProposalsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1800));
      setProposals([
        {
          title: "Proposal example title #1",
          status: "Active",
          date: "Mar 14th, 2025",
          votesFor: 573.63,
          votesAgainst: 0.04,
          voted: true,
          voteDirection: "for",
        },
        {
          title: "Proposal example title #1",
          status: "Active",
          date: "Mar 14th, 2025",
          votesFor: 703.99,
          votesAgainst: 0.29,
          voted: true,
          voteDirection: null,
        },
      ]);
      setIsProposalsLoading(false);
    } catch (error) {
      setIsError(true);
      setErrorMessage("Failed to load proposals. Please try again.");
      setIsProposalsLoading(false);
    }
  };

  const handleRetry = () => {
    setIsError(false);
    setErrorMessage("");
    if (isConnected) {
      loadAllData();
    }
  };

  const formatNameForURL = (name: string) => {
    return name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  };

  const itemVariants = {
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.2 },
    },
  };

  const handleRewardsButtonClick = () => {
    setIsRewardsModalOpen(true);
    setModalKey(Date.now());
  };

  const handleRewardsModalClose = () => {
    setIsRewardsModalOpen(false);
    setProfileName("");
    setDelegateAddress("");
    setApr("");
    setFundingAmount("");
  };


  const handleRewardsSubmit = async () => {
    setLoading(true);
    try {
      await switchChainAsync({ chainId: mainnet.id });

      if (!address || !compensatorContract) {
        throw new Error("Please connect to a wallet");
      }

      // Validate inputs
      if (!profileName || !delegateAddress || !apr || !fundingAmount) {
        throw new Error("Please fill in all fields");
      }

      // Convert APR to COMP/second
      const aprValue = Number.parseFloat(apr);
      if (isNaN(aprValue) || aprValue <= 0) {
        throw new Error("Invalid APR value");
      }

      const secondsInYear = 365 * 24 * 60 * 60;
      const compPerSecond =
        ((aprValue / 100) * Number.parseFloat(fundingAmount)) / secondsInYear;

      const { provider } = await getEthersSigner(wagmiConfig);
      const feeData = await provider.getFeeData();
      const gas = await compensatorContract.createCompensator.estimateGas(
        delegateAddress,
        profileName
      );

      const receipt = await compensatorContract.createCompensator(
        delegateAddress,
        profileName,
        {
          gasLimit: gas,
          maxFeePerGas: feeData.maxFeePerGas,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        }
      );
      const transactionReceipt = await waitForTransactionReceipt(wagmiConfig, {
        hash: receipt?.hash,
      });

      if (transactionReceipt?.status === "success") {
        toast.success("Successful Created");
        handleRewardsModalClose();
      }

      // const response = await fetch("/api/createCompensator", {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //   },
      //   body: JSON.stringify({
      //     delegatee: delegateAddress,
      //     delegateeName: profileName,
      //     rewardRate: compPerSecond.toString(),
      //     fundingAmount: fundingAmount,
      //   }),
      // });

      // if (!response.ok) {
      //   throw new Error("Failed to create Compensator contract");
      // }

      // const data = await response.json();
      // console.log("Compensator contract created:", data);
    } catch (error) {
      console.error("Error creating compensator contract:", error);
      setIsError(true);
      setErrorMessage(
        "Failed to create Compensator contract. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>My Profile | Compensator</title>
        <meta
          name="description"
          content="View your Compound governance profile and delegations"
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
          className="flex flex-col items-center justify-center min-h-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <AnimatePresence>
            {isError && (
              <motion.div
                className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg shadow-md flex items-center"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <AlertCircle className="h-5 w-5 mr-2" />
                <span>{errorMessage}</span>
                <button
                  onClick={handleRetry}
                  className="ml-4 text-sm font-medium underline hover:text-red-800 dark:hover:text-red-300"
                >
                  Retry
                </button>
                <button
                  onClick={() => setIsError(false)}
                  className="ml-2 text-sm font-medium hover:text-red-800 dark:hover:text-red-300"
                >
                  ✕
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mx-auto max-w-[1100px] w-full p-4 mt-[-120px]">
            {!isConnected ? (
              <motion.div
                className="mb-8 bg-white dark:bg-[#1D2833] p-6 rounded-lg"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="p-3 bg-[#EFF2F5] dark:bg-[#293846] rounded-full mb-3">
                    <Wallet className="h-6 w-6 text-[#030303] dark:text-white" />
                  </div>
                  <h2 className="text-lg font-semibold text-[#030303] dark:text-white">
                    Disconnected
                  </h2>
                  <p className="text-[#6D7C8D] mt-1 font-medium dark:text-gray-400 mb-4 max-w-md mx-auto">
                    Connect a web3 wallet to view your profile
                  </p>
                  <div className="w-auto">
                    <ConnectWalletButton isMobile={false} />
                  </div>
                </div>
              </motion.div>
            ) : (
              <>
                <motion.div
                  className="mt-[140px] mb-8 bg-white dark:bg-[#1D2833] p-6 rounded-lg shadow-sm"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {isProfileLoading ? (
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                      <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-[#33475b] animate-pulse"></div>
                      <div className="flex-1">
                        <div className="h-6 w-48 bg-gray-200 dark:bg-[#33475b] rounded-md animate-pulse mb-2"></div>
                        <div className="h-4 w-32 bg-gray-200 dark:bg-[#33475b] rounded-md animate-pulse mb-3"></div>
                        <div className="h-3 w-24 bg-gray-200 dark:bg-[#33475b] rounded-md animate-pulse mb-2"></div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                      <div className="w-24 h-24 rounded-full overflow-hidden">
                        <Image
                          src={profile?.image || "/logo.png"}
                          alt="Your Profile"
                          width={96}
                          height={96}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 font-medium">
                        <h2 className="text-xl font-bold text-[#030303] dark:text-white">
                          {profile?.name || "Username"}
                        </h2>
                        <p className="text-sm text-[#6D7C8D] dark:text-gray-400">
                          {profile?.address ||
                            (address
                              ? `${address.substring(
                                  0,
                                  6
                                )}...${address.substring(address.length - 4)}`
                              : "0x1234...5678")}
                        </p>
                        <p className="text-sm text-[#6D7C8D] dark:text-gray-400 mt-3">
                          {profile?.bio || "Bio goes here"}
                        </p>
                        <div className="flex flex-wrap items-center gap-4 mt-4">
                          <div className="flex items-center gap-1 text-sm text-[#6D7C8D] dark:text-gray-400">
                            Vote Power
                            <span className="text-[#030303] dark:text-white">
                              {profile?.votingPower || "0.00 COMP"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-sm text-[#6D7C8D] dark:text-gray-400">
                            Delegators:
                            <span className="text-[#030303] dark:text-white">
                              {profile?.activeDelegations || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-row gap-2">
                        <button
                          onClick={handleRewardsButtonClick}
                          className="bg-[#EFF2F5] transition-all text-sm duration-200 transform hover:scale-105 active:scale-95 dark:bg-white text-[#0D131A] px-6 py-2 rounded-full hover:bg-emerald-600 hover:text-white dark:hover:text-[#0D131A] font-semibold"
                        >
                          Create Compensator
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>

                {isRewardsModalOpen && (
                  <Modal
                    handleClose={handleRewardsModalClose}
                    open={isRewardsModalOpen}
                    key={modalKey}
                  >
                    <div className="">
                      <h2 className="text-xl font-semibold mb-4 dark:text-white">
                        Create Compensator
                      </h2>
                      <div className="space-y-4">
                        {/* Profile Name Input */}
                        <motion.div
                          className="relative"
                          variants={itemVariants}
                        >
                          <div className="relative h-14">
                            <input
                              id="profileName"
                              type="text"
                              value={profileName}
                              onChange={(e) => setProfileName(e.target.value)}
                              onFocus={() => setIsFocused(true)}
                              onBlur={() => setIsFocused(false)}
                              className="absolute font-semibold pb-2 inset-0 h-full p-3 px-4 rounded-lg w-full transition-all bg-[#EFF2F5] dark:bg-[#1D2833] border border-[#efefef] dark:border-[#28303e] text-[#030303] dark:text-white outline-none focus:border-emerald-300 dark:focus:border-emerald-700"
                              autoFocus
                            />
                            <label
                              htmlFor="profileName"
                              className={`absolute left-4 pointer-events-none transition-all duration-200 ${
                                isFocused || profileName
                                  ? "text-xs text-emerald-500 dark:text-emerald-400 top-1"
                                  : "text-sm text-gray-500 dark:text-gray-400 top-1/2 -translate-y-1/2"
                              }`}
                            >
                              Profile Name
                            </label>
                          </div>
                        </motion.div>

                        {/* Delegate Address Input */}
                        <motion.div
                          className="relative"
                          variants={itemVariants}
                        >
                          <div className="relative h-14">
                            <input
                              id="delegateAddress"
                              type="text"
                              value={delegateAddress}
                              onChange={(e) =>
                                setDelegateAddress(e.target.value)
                              }
                              onFocus={() => setIsFocused(true)}
                              onBlur={() => setIsFocused(false)}
                              className="absolute font-semibold pb-2 inset-0 h-full p-3 px-4 rounded-lg w-full transition-all bg-[#EFF2F5] dark:bg-[#1D2833] border border-[#efefef] dark:border-[#28303e] text-[#030303] dark:text-white outline-none focus:border-emerald-300 dark:focus:border-emerald-700"
                            />
                            <label
                              htmlFor="delegateAddress"
                              className={`absolute left-4 pointer-events-none transition-all duration-200 ${
                                isFocused || delegateAddress
                                  ? "text-xs text-emerald-500 dark:text-emerald-400 top-1"
                                  : "text-sm text-gray-500 dark:text-gray-400 top-1/2 -translate-y-1/2"
                              }`}
                            >
                              Delegate Address
                            </label>
                            <button
                              onClick={() => setDelegateAddress(address || "")}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-[#EFF2F5] dark:bg-[#2e3746] transition-colors"
                            >
                              <WandSparkles className="h-4 w-4 text-[#6D7C8D] dark:text-gray-400" />
                            </button>
                          </div>
                        </motion.div>

                        {/* APR Input */}
                        <motion.div
                          className="relative"
                          variants={itemVariants}
                        >
                          <div className="relative h-14">
                            <input
                              id="apr"
                              type="number"
                              value={apr}
                              onChange={(e) => setApr(e.target.value)}
                              onFocus={() => setIsFocused(true)}
                              onBlur={() => setIsFocused(false)}
                              className="absolute font-semibold pb-2 inset-0 h-full p-3 px-4 rounded-lg w-full transition-all bg-[#EFF2F5] dark:bg-[#1D2833] border border-[#efefef] dark:border-[#28303e] text-[#030303] dark:text-white outline-none focus:border-emerald-300 dark:focus:border-emerald-700"
                            />
                            <label
                              htmlFor="apr"
                              className={`absolute left-4 pointer-events-none transition-all duration-200 ${
                                isFocused || apr
                                  ? "text-xs text-emerald-500 dark:text-emerald-400 top-1"
                                  : "text-sm text-gray-500 dark:text-gray-400 top-1/2 -translate-y-1/2"
                              }`}
                            >
                              Reward Rate (APR %)
                            </label>
                          </div>
                        </motion.div>

                        {/* Funding Amount Input */}
                        <motion.div
                          className="relative"
                          variants={itemVariants}
                        >
                          <div className="relative h-14">
                            <input
                              id="fundingAmount"
                              type="number"
                              value={fundingAmount}
                              onChange={(e) => setFundingAmount(e.target.value)}
                              onFocus={() => setIsFocused(true)}
                              onBlur={() => setIsFocused(false)}
                              className="absolute font-semibold pb-2 inset-0 h-full p-3 px-4 rounded-lg w-full transition-all bg-[#EFF2F5] dark:bg-[#1D2833] border border-[#efefef] dark:border-[#28303e] text-[#030303] dark:text-white outline-none focus:border-emerald-300 dark:focus:border-emerald-700"
                            />
                            <label
                              htmlFor="fundingAmount"
                              className={`absolute left-4 pointer-events-none transition-all duration-200 ${
                                isFocused || fundingAmount
                                  ? "text-xs text-emerald-500 dark:text-emerald-400 top-1"
                                  : "text-sm text-gray-500 dark:text-gray-400 top-1/2 -translate-y-1/2"
                              }`}
                            >
                              Funding Amount (COMP)
                            </label>
                          </div>
                        </motion.div>
                      </div>
                      <button
                        onClick={handleRewardsSubmit}
                        disabled={
                          !profileName ||
                          !delegateAddress ||
                          !apr ||
                          !fundingAmount ||
                          loading
                        }
                        className={`${
                          loading ||
                          !profileName ||
                          !delegateAddress ||
                          !apr ||
                          !fundingAmount
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-emerald-600"
                        } transition-all duration-200 font-semibold transform hover:scale-105 active:scale-95 w-full text-sm bg-[#10b981e0] text-white py-3 text-center rounded-full flex justify-center items-center mt-4`}
                      >
                        {loading ? (
                          <svg
                            className="animate-spin h-4 w-4 text-white"
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
                        ) : (
                          "Create Compensator"
                        )}
                      </button>
                    </div>
                  </Modal>
                )}

                <motion.div
                  className="mb-8"
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.2, delay: 0.2 }}
                >
                  <h2 className="text-xl font-semibold text-[#030303] dark:text-white mb-3">
                    History
                  </h2>

                  {isProposalsLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[1, 2].map((_, index) => (
                        <div
                          key={index}
                          className="p-4 bg-white dark:bg-[#1D2833] rounded-lg shadow-sm animate-pulse"
                        >
                          <div className="h-6 w-3/4 bg-gray-200 dark:bg-[#33475b] rounded-md mb-3"></div>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="h-5 w-16 bg-gray-200 dark:bg-[#33475b] rounded-full"></div>
                            <div className="h-4 w-24 bg-gray-200 dark:bg-[#33475b] rounded-md"></div>
                          </div>
                          <div className="h-4 w-full bg-gray-200 dark:bg-[#33475b] rounded-md mb-2"></div>
                          <div className="h-2 w-full bg-gray-200 dark:bg-[#33475b] rounded-full mb-2"></div>
                          <div className="flex justify-between">
                            <div className="h-4 w-20 bg-gray-200 dark:bg-[#33475b] rounded-md"></div>
                            <div className="h-4 w-20 bg-gray-200 dark:bg-[#33475b] rounded-md"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : proposals.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {proposals.map((proposal, index) => (
                        <div
                          key={index}
                          className="p-4 bg-white dark:bg-[#1D2833] rounded-lg shadow-sm cursor-pointer"
                        >
                          <h3 className="text-lg font-semibold text-[#030303] dark:text-white">
                            {proposal.title}
                          </h3>
                          <div className="flex items-center mt-2">
                            <span
                              className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                proposal.status === "Active"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                              }`}
                            >
                              {proposal.status}
                            </span>
                            <span className="text-sm text-[#6D7C8D] font-medium dark:text-gray-400 ml-2">
                              {proposal.date}
                            </span>
                          </div>
                          <div className="mt-3">
                            <div className="flex justify-between mb-1">
                              <p className="text-sm font-medium text-[#6D7C8D] dark:text-gray-400">
                                Votes
                              </p>
                              <p className="text-sm font-medium text-[#6D7C8D] dark:text-gray-400">
                                {(
                                  proposal.votesFor + proposal.votesAgainst
                                ).toFixed(2)}
                                K
                              </p>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-[#33475b] rounded-full h-1.5">
                              <div
                                className="bg-emerald-500 h-1.5 rounded-full"
                                style={{
                                  width: `${
                                    (proposal.votesFor /
                                      (proposal.votesFor +
                                        proposal.votesAgainst)) *
                                    100
                                  }%`,
                                }}
                              ></div>
                            </div>
                            <div className="flex justify-between mt-2">
                              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                                {proposal.votesFor}K
                              </p>
                              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                                {proposal.votesAgainst}K
                              </p>
                            </div>
                          </div>
                          {proposal.voted && (
                            <div className="mt-3 flex items-center">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  proposal.voteDirection === "for"
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                }`}
                              >
                                You voted{" "}
                                {proposal.voteDirection === "for"
                                  ? "For"
                                  : "Against"}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-[#1D2833] rounded-lg shadow-sm p-8 text-center">
                      <div className="p-3 bg-[#EFF2F5] dark:bg-[#293846] rounded-full mx-auto mb-3 w-fit">
                        <TrendingUp className="h-6 w-6 text-[#030303] dark:text-white" />
                      </div>
                      <h2 className="text-lg font-semibold text-[#030303] dark:text-white">
                        No Voting History
                      </h2>
                      <p className="text-[#6D7C8D] dark:text-gray-400 mb-6 max-w-sm mx-auto">
                        You haven't voted on any proposals yet. Active proposals
                        will appear here once you've voted.
                      </p>
                      <Link
                        href="#"
                        className="bg-[#EFF2F5] transition-all duration-200 transform hover:scale-105 active:scale-95 dark:bg-white text-[#0D131A] px-6 py-2 rounded-full hover:bg-emerald-600 hover:text-white dark:hover:text-white font-semibold"
                      >
                        View Proposals
                      </Link>
                    </div>
                  )}
                </motion.div>

                <motion.div
                  className="mb-8"
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                >
                  <h2 className="text-xl font-semibold text-[#030303] dark:text-white mb-3">
                    Delegations
                  </h2>

                  {isDelegationsLoading ? (
                    <div className="space-y-4">
                      {[1, 2].map((_, index) => (
                        <div
                          key={index}
                          className="p-4 bg-white dark:bg-[#1D2833] rounded-lg shadow-sm animate-pulse"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 bg-gray-200 dark:bg-[#33475b] rounded-full"></div>
                            <div>
                              <div className="h-5 w-40 bg-gray-200 dark:bg-[#33475b] rounded-md mb-2"></div>
                              <div className="h-4 w-32 bg-gray-200 dark:bg-[#33475b] rounded-md"></div>
                            </div>
                            <div className="ml-auto h-4 w-20 bg-gray-200 dark:bg-[#33475b] rounded-md"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : delegations.length > 0 ? (
                    <div className="space-y-4">
                      {delegations.map((delegation, index) => (
                        <div
                          key={index}
                          className="p-4 bg-white dark:bg-[#1D2833] rounded-lg shadow-sm cursor-pointer"
                          onClick={() =>
                            (window.location.href = `/delegate/${formatNameForURL(
                              delegation.delegate
                            )}`)
                          }
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative h-12 w-12 flex-shrink-0">
                              <Image
                                src={
                                  delegation.delegateImage ||
                                  "/placeholder.svg?height=48&width=48"
                                }
                                alt={delegation.delegate}
                                width={48}
                                height={48}
                                className="object-cover rounded-full"
                              />
                            </div>
                            <div className="">
                              <p className="text-base font-semibold text-[#030303] dark:text-white">
                                {delegation.delegate}
                              </p>
                              <p className="text-sm text-[#6D7C8D] dark:text-gray-400">
                                Amount: {delegation.amount}
                              </p>
                            </div>
                            <p className="ml-auto text-xs font-medium text-[#6D7C8D] dark:text-gray-400">
                              {delegation.date}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-[#1D2833] rounded-lg shadow-sm p-8 text-center">
                      <div className="p-3 bg-[#EFF2F5] dark:bg-[#293846] rounded-full mx-auto mb-3 w-fit">
                        <Users className="h-6 w-6 text-[#030303] dark:text-white" />
                      </div>
                      <h2 className="text-lg font-semibold text-[#030303] dark:text-white">
                        No Delegations Yet
                      </h2>
                      <p className="text-[#6D7C8D] dark:text-gray-400 mb-6 max-w-sm mx-auto">
                        You haven't delegated to anyone yet. Find delegates to
                        support on the explore page.
                      </p>
                      <Link
                        href="/explore"
                        className="bg-[#EFF2F5] transition-all duration-200 transform hover:scale-105 active:scale-95 dark:bg-white text-[#0D131A] px-6 py-2 rounded-full hover:bg-emerald-600 hover:text-white dark:hover:text-white font-semibold"
                      >
                        Find Delegates
                      </Link>
                    </div>
                  )}
                </motion.div>
              </>
            )}
          </div>
        </motion.main>
        <Footer />
      </div>
    </>
  );
}
