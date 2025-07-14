"use client";

export const dynamic = 'force-dynamic';

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
  Copy,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAccount, useSwitchChain } from "wagmi";
import ConnectWalletButton from "@/components/MainLayout/ConnectWalletButton";
import Modal from "@/components/common/Modal";
import { useGetCompensatorFactoryContract } from "@/hooks/useGetCompensatorFactoryContract";
import { getEthersSigner } from "@/hooks/useEtherProvider";
import { wagmiConfig } from "@/app/providers";
import { waitForTransactionReceipt } from "@wagmi/core";
import toast from "react-hot-toast";
import { mainnet } from "wagmi/chains";
import { useGetCompensatorContract } from "@/hooks/useGetCompensatorContract";
import { ethers } from "ethers";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useGetCompoundContract } from "@/hooks/useGetCompContract";
import BigNumber from "bignumber.js";

interface UserProfile {
  name: string;
  address: string;
  image: string;
  bio: string;
  votingPower: string;
  totalDelegations: number;
  activeDelegations: number;
  statement?: string;
  rewards?: string;
  staked?: string;
}

interface Delegation {
  delegate: string;
  delegateImage: string;
  amount: string;
  date: string;
}

interface Proposal {
  id: string;
  title: string;
  status: "active" | "executed" | "defeated";
  date: string;
  votesFor: number;
  votesAgainst: number;
  voted: boolean;
  voteDirection: "for" | "against" | null;
}

export default function ProfilePage() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const theme = useSettingTheme();
  const { address, isConnected } = useAccount();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(true);
  const [isDelegationsLoading, setIsDelegationsLoading] = useState<boolean>(true);
  const [isProposalsLoading, setIsProposalsLoading] = useState<boolean>(true);
  const [isRewardsModalOpen, setIsRewardsModalOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [profileName, setProfileName] = useState<string>("");
  const [delegateAddress, setDelegateAddress] = useState<string>("");
  const [apr, setApr] = useState<string>("");
  const [fundingAmount, setFundingAmount] = useState<string>("");
  const [isProfileNameFocused, setIsProfileNameFocused] = useState(false);
  const [isDelegateAddressFocused, setIsDelegateAddressFocused] = useState(false);
  const [isAprFocused, setIsAprFocused] = useState(false);
  const [isFundingAmountFocused, setIsFundingAmountFocused] = useState(false);
  const [isProposalFocused, setIsProposalFocused] = useState(false);
  const [modalKey, setModalKey] = useState<number>(Date.now());
  const [activeTab, setActiveTab] = useState<string>("proposals");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(3);
  const { compensatorFactoryContract } = useGetCompensatorFactoryContract();
  const { switchChainAsync } = useSwitchChain();
  const { handleSetCompensatorContract } = useGetCompensatorContract();
  const { compoundContract } = useGetCompoundContract();
  const [isClaiming, setIsClaiming] = useState<boolean>(false);
  const [isWithdrawing, setIsWithdrawing] = useState<boolean>(false);

  const loadAllData = useCallback(async () => {
    try {
      await Promise.all([
        fetchProfileData(),
        fetchDelegations(),
        fetchProposals(),
      ]);
    } catch (error) {
      console.error("Error loading data:", error);
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

  if (!isClient) return null;

  const fetchProfileData = async () => {
    setIsProfileLoading(true);
    try {
      if (!address || !compensatorFactoryContract) {
        throw new Error("Please connect to a wallet");
      }

      // Get the user's compensator contract address
      const compensatorAddress = await compensatorFactoryContract.getCompensator(address);
      if (!compensatorAddress || compensatorAddress === ethers.ZeroAddress) {
        setProfile({
          name: "Username",
          address: address || "0x1234..5678",
          image: "/logo.png",
          bio: "Compound governance participant",
          votingPower: "0",
          totalDelegations: 0,
          activeDelegations: 0,
          statement: "",
          rewards: "0",
          staked: "0",
        });
        setIsProfileLoading(false);
        return;
      }

      // Get the compensator contract
      const compensatorContract = await handleSetCompensatorContract(compensatorAddress);
      if (!compensatorContract) {
        throw new Error("Failed to get compensator contract");
      }

      // Get pending rewards
      const pendingRewards = await compensatorContract.getPendingRewards(address);
      const formattedRewards = ethers.formatEther(pendingRewards);

      // Get staked amount
      const stakedAmount = await compensatorContract.balanceOf(address);
      const formattedStaked = ethers.formatEther(stakedAmount);

      // Get total delegated COMP
      const totalDelegatedCOMP = await compensatorContract.totalDelegatedCOMP();
      const formattedTotalDelegated = ethers.formatEther(totalDelegatedCOMP);

      // Get vote power from COMP token
      const votePower = await compoundContract?.getCurrentVotes(address);
      const formattedVotePower = votePower ? ethers.formatEther(votePower) : "0";

      setProfile({
        name: "Username",
        address: address || "0x1234..5678",
        image: "/logo.png",
        bio: "Compound governance participant",
        votingPower: formattedVotePower,
        totalDelegations: Number(formattedTotalDelegated),
        activeDelegations: 0,
        statement: "",
        rewards: formattedRewards,
        staked: formattedStaked,
      });
      setIsProfileLoading(false);
    } catch (error) {
      console.error("Error fetching profile data:", error);
      setIsProfileLoading(false);
    }
  };

  const fetchDelegations = async () => {
    setIsDelegationsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setDelegations([
        {
          delegate: "@example 1",
          delegateImage: "/logo.png",
          amount: "500 COMP",
          date: "Feb 28th, 2025",
        },
        {
          delegate: "@example 2",
          delegateImage: "/logo.png",
          amount: "300 COMP",
          date: "Mar 5th, 2025",
        },
      ]);
      setIsDelegationsLoading(false);
    } catch (error) {
      console.error("Error fetching delegations:", error);
      setIsDelegationsLoading(false);
    }
  };

  const fetchProposals = async () => {
    setIsProposalsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1800));
      // Generate more proposals for pagination demonstration
      const proposalData: Proposal[] = [
        {
          id: "1",
          title: "Initialize cWETHv3 on Ronin",
          status: "active",
          date: "Mar 18th, 2025",
          votesFor: 518.81,
          votesAgainst: 0.94,
          voted: false,
          voteDirection: null,
        },
        {
          id: "2",
          title: "Add wsuperOETHb as collateral into cWETHv3 on Base",
          status: "executed",
          date: "Mar 14th, 2025",
          votesFor: 703.99,
          votesAgainst: 1.58,
          voted: false,
          voteDirection: null,
        },
        {
          id: "3",
          title: "Add tETH as collateral into cWETHv3 on Mainnet",
          status: "executed",
          date: "Mar 14th, 2025",
          votesFor: 703.99,
          votesAgainst: 0.3,
          voted: false,
          voteDirection: null,
        },
        {
          id: "4",
          title: "[Gauntlet] - Rewards Top Up for Ethereum, Base and Optimism",
          status: "executed",
          date: "Mar 10th, 2025",
          votesFor: 684,
          votesAgainst: 0.29,
          voted: false,
          voteDirection: null,
        },
        {
          id: "5",
          title: "2025 Compound Growth Program - Roadmap & Renewal",
          status: "defeated",
          date: "Mar 6th, 2025",
          votesFor: 100.3,
          votesAgainst: 517.09,
          voted: false,
          voteDirection: null,
        },
        {
          id: "6",
          title: "Compound Grants Program Renewal",
          status: "executed",
          date: "Mar 1st, 2025",
          votesFor: 650.2,
          votesAgainst: 12.5,
          voted: true,
          voteDirection: "for",
        },
        {
          id: "7",
          title: "Update cUSDC Interest Rate Model",
          status: "executed",
          date: "Feb 25th, 2025",
          votesFor: 712.4,
          votesAgainst: 0.0,
          voted: true,
          voteDirection: "for",
        },
      ];
      setProposals(proposalData as any);
      setIsProposalsLoading(false);
    } catch (error) {
      console.error("Error fetching proposals:", error);
      setIsProposalsLoading(false);
    }
  };



  const formatNameForURL = (name: string) => {
    return name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
  };

  const formatAddress = (addr: string) => {
    if (!addr) return "";
    return addr.length > 12
      ? `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`
      : addr;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Address copied to clipboard", {
      style: {
        fontWeight: "600",
      },
    });
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
    setModalKey(Date.now());
  };

  const handleSetReward = async (compensatorAddress: string) => {
    try {
      const compensatorContract = await handleSetCompensatorContract(
        compensatorAddress
      );
      if (!compensatorContract) {
        return toast.error("Compensator contract not found", {
          style: {
            fontWeight: "600",
          },
        });
      }

      const { provider } = await getEthersSigner(wagmiConfig);
      const feeData = await provider.getFeeData();
      const gas = await compensatorContract.setRewardRate.estimateGas(
        ethers.parseUnits(apr, 18).toString()
      );
      const receipt = await compensatorContract.setRewardRate(
        ethers.parseUnits(apr, 18).toString(),
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
        toast.success("Set reward successfully", {
          style: {
            fontWeight: "600",
          },
        });
        await handleSetFundingAmount(compensatorAddress);
      }
    } catch (error) {
      console.log("error :>> ", error);
      setLoading(false);
    }
  };

  const handleSetFundingAmount = async (compensatorAddress: string) => {
    try {
      const compensatorContract = await handleSetCompensatorContract(
        compensatorAddress
      );
      if (!compensatorContract) {
        throw new Error("Compensator contract not found");
      }

      if (!compoundContract) {
        return toast.error("Compound contract not found", {
          style: {
            fontWeight: "600",
          },
        });
      }
      const decimals = await compoundContract.decimals();
      const convertAmount = ethers
        .parseUnits(fundingAmount ? fundingAmount?.toString() : "0", decimals)
        .toString();
      const { provider } = await getEthersSigner(wagmiConfig);
      const feeData = await provider.getFeeData();

      // allowance
      const allowance = await compoundContract.allowance(
        address,
        compensatorAddress
      );
      if (new BigNumber(allowance).lt(new BigNumber(convertAmount))) {
        const gas = await compoundContract.approve.estimateGas(
          compensatorAddress,
          convertAmount
        );
        const approveReceipt = await compoundContract?.approve(
          compensatorAddress,
          convertAmount,
          {
            gasLimit: gas,
            maxFeePerGas: feeData.maxFeePerGas,
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
          }
        );
        const transactionApproveReceipt = await waitForTransactionReceipt(
          wagmiConfig,
          {
            hash: approveReceipt?.hash,
          }
        );

        if (transactionApproveReceipt?.status === "success") {
          toast.success("Successful Approved", {
            style: {
              fontWeight: "600",
            },
          });
        }
      }

      const gas = await compensatorContract.delegateDeposit.estimateGas(
        convertAmount
      );
      const delegatedReceipt = await compensatorContract.delegateDeposit(
        convertAmount,
        {
          gasLimit: gas,
          maxFeePerGas: feeData.maxFeePerGas,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        }
      );
      const transactionDelegatorReceipt = await waitForTransactionReceipt(
        wagmiConfig,
        {
          hash: delegatedReceipt?.hash,
        }
      );
      if (transactionDelegatorReceipt?.status === "success") {
        toast.success("Set Funding Successfully", {
          style: {
            fontWeight: "600",
          },
        });
        handleRewardsModalClose();
      }
    } catch (error) {
      console.log("error :>> ", error);
      toast.error("Failed to set Funding", {
        style: {
          fontWeight: "600",
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRewardsSubmit = async () => {
    setLoading(true);
    try {
      await switchChainAsync({ chainId: mainnet.id });

      if (!address || !compensatorFactoryContract) {
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
      const gas =
        await compensatorFactoryContract.createCompensator.estimateGas(
          delegateAddress,
          profileName
        );

      const receipt = await compensatorFactoryContract.createCompensator(
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
        toast.success("Compensator created successfully", {
          style: {
            fontWeight: "600",
          },
        });
        const compensatorAddress =
          await compensatorFactoryContract.getCompensator(delegateAddress);
        await handleSetReward(compensatorAddress);
        handleRewardsModalClose();
      }
    } catch (error) {
      setLoading(false);
      console.error("Error creating compensator contract:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <Clock className="h-3 w-3 mr-1 inline" />
            Active
          </span>
        );
      case "executed":
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            <CheckCircle className="h-3 w-3 mr-1 inline" />
            Executed
          </span>
        );
      case "defeated":
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <XCircle className="h-3 w-3 mr-1 inline" />
            Defeated
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
            <AlertTriangle className="h-3 w-3 mr-1 inline" />
            {status}
          </span>
        );
    }
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProposals = proposals.slice(indexOfFirstItem, indexOfLastItem);

  const paginate = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleClaimRewards = async () => {
    if (!address || !compensatorFactoryContract) {
      toast.error("Please connect to a wallet", {
        style: {
          fontWeight: "600",
        },
      });
      return;
    }

    setIsClaiming(true);
    try {
      // Get the user's compensator contract address
      const compensatorAddress = await compensatorFactoryContract.getCompensator(address);
      if (!compensatorAddress || compensatorAddress === ethers.ZeroAddress) {
        toast.error("No compensator contract found", {
          style: {
            fontWeight: "600",
          },
        });
        return;
      }

      // Get the compensator contract
      const compensatorContract = await handleSetCompensatorContract(compensatorAddress);
      if (!compensatorContract) {
        toast.error("Failed to get compensator contract", {
          style: {
            fontWeight: "600",
          },
        });
        return;
      }

      // Get the current rewards before claiming
      const pendingRewards = await compensatorContract.getPendingRewards(address);
      if (pendingRewards === BigInt(0)) {
        toast.error("No rewards to claim", {
          style: {
            fontWeight: "600",
          },
        });
        return;
      }

      // Claim rewards
      const { provider } = await getEthersSigner(wagmiConfig);
      const feeData = await provider.getFeeData();
      const gas = await compensatorContract.claimRewards.estimateGas();
      const receipt = await compensatorContract.claimRewards({
        gasLimit: gas,
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
      });

      const transactionReceipt = await waitForTransactionReceipt(wagmiConfig, {
        hash: receipt?.hash,
      });

      if (transactionReceipt?.status === "success") {
        toast.success("Rewards claimed successfully", {
          style: {
            fontWeight: "600",
          },
        });
        // Refresh profile data to update rewards
        await fetchProfileData();
      }
    } catch (error) {
      console.error("Error claiming rewards:", error);
      toast.error("Failed to claim rewards", {
        style: {
          fontWeight: "600",
        },
      });
    } finally {
      setIsClaiming(false);
    }
  };

  const handleWithdrawStaked = async () => {
    if (!address || !compensatorFactoryContract) {
      toast.error("Please connect to a wallet", {
        style: {
          fontWeight: "600",
        },
      });
      return;
    }

    setIsWithdrawing(true);
    try {
      // Get the user's compensator contract address
      const compensatorAddress = await compensatorFactoryContract.getCompensator(address);
      if (!compensatorAddress || compensatorAddress === ethers.ZeroAddress) {
        toast.error("No compensator contract found", {
          style: {
            fontWeight: "600",
          },
        });
        return;
      }

      // Get the compensator contract
      const compensatorContract = await handleSetCompensatorContract(compensatorAddress);
      if (!compensatorContract) {
        toast.error("Failed to get compensator contract", {
          style: {
            fontWeight: "600",
          },
        });
        return;
      }

      // Get the current staked amount
      const stakedAmount = await compensatorContract.balanceOf(address);
      if (stakedAmount === BigInt(0)) {
        toast.error("No staked tokens to withdraw", {
          style: {
            fontWeight: "600",
          },
        });
        return;
      }

      // Withdraw staked tokens
      const { provider } = await getEthersSigner(wagmiConfig);
      const feeData = await provider.getFeeData();
      const gas = await compensatorContract.delegatorWithdraw.estimateGas(stakedAmount);
      const receipt = await compensatorContract.delegatorWithdraw(stakedAmount, {
        gasLimit: gas,
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
      });

      const transactionReceipt = await waitForTransactionReceipt(wagmiConfig, {
        hash: receipt?.hash,
      });

      if (transactionReceipt?.status === "success") {
        toast.success("Staked tokens withdrawn successfully", {
          style: {
            fontWeight: "600",
          },
        });
        // Refresh profile data to update staked amount
        await fetchProfileData();
      }
    } catch (error) {
      console.error("Error withdrawing staked tokens:", error);
      toast.error("Failed to withdraw staked tokens", {
        style: {
          fontWeight: "600",
        },
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

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

        <motion.main
          className="flex flex-col items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >


          <div className="mx-auto max-w-[1100px] w-full p-4 pt-8">
            <motion.div
              className="mb-4 bg-white dark:bg-[#1D2833] p-6 rounded-lg shadow-sm border border-[#efefef] dark:border-[#232F3B]"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {isProfileLoading ? (
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gray-200 dark:bg-[#33475b] rounded-full animate-pulse"></div>
                      <div className="flex-1">
                        <div className="h-6 w-48 bg-gray-200 dark:bg-[#33475b] rounded-md animate-pulse mb-2"></div>
                        <div className="h-4 w-32 bg-gray-200 dark:bg-[#33475b] rounded-md animate-pulse"></div>
                      </div>
                    </div>
                    <div className="hidden md:block">
                      <div className="h-10 w-40 rounded-full bg-gray-200 dark:bg-[#33475b] animate-pulse"></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <div className="h-24 bg-gray-200 dark:bg-[#33475b] rounded-lg animate-pulse"></div>
                    <div className="h-24 bg-gray-200 dark:bg-[#33475b] rounded-lg animate-pulse"></div>
                    <div className="h-24 bg-gray-200 dark:bg-[#33475b] rounded-lg animate-pulse"></div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center">
                        <Image
                          src={profile?.image || "/logo.png"}
                          alt="Profile"
                          width={64}
                          height={64}
                          className="rounded-full"
                        />
                      </div>
                      <div>
                        <h1 className="text-2xl font-bold text-[#030303] dark:text-white">
                          {isConnected ? formatAddress(address || "") : "My Profile"}
                        </h1>
                        <div className="flex items-center mt-1">
                          {isConnected ? (
                            <>
                              <p className="text-sm text-[#6D7C8D] dark:text-gray-400">
                                {formatAddress(address || "")}
                              </p>
                              <button
                                onClick={() => copyToClipboard(address || "")}
                                className="ml-2 text-[#6D7C8D] hover:text-[#030303] dark:hover:text-gray-300"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <p className="text-sm text-[#6D7C8D] font-medium dark:text-gray-400">
                              Connect wallet to view profile
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="">
                      <button
                        onClick={() => setIsRewardsModalOpen(true)}
                        className="transition-all duration-200 font-semibold transform hover:scale-105 active:scale-95 w-full text-sm bg-[#10b981] dark:bg-white text-white dark:text-[#0D131A] px-4 py-[9px] text-center rounded-full flex justify-center items-center"
                      >
                        Create Compensator
                      </button>
                    </div>
                  </div>

                  {profile?.statement && (
                    <div className="mt-8 p-4 bg-[#F9FAFB] dark:bg-[#17212B] rounded-lg border border-[#efefef] dark:border-[#232F3B]">
                      <h3 className="text-sm font-medium text-[#030303] dark:text-white mb-2">
                        Delegation Statement
                      </h3>
                      <p className="text-[#6D7C8D] dark:text-gray-400 text-sm">
                        {profile.statement}
                      </p>
                    </div>
                  )}

                  <div className="flex-grow"></div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-[54px]">
                    <div className="bg-[#F9FAFB] dark:bg-[#17212B] p-4 rounded-lg border border-[#efefef] dark:border-[#232F3B]">
                      <div className="flex items-center space-x-2 mb-2">
                        <img
                          src="/logo.png"
                          alt=""
                          className="h-5 w-5 rounded-full"
                        />
                        <p className="text-2xl font-bold text-[#030303] dark:text-white">
                          {profile?.votingPower || "0"}
                        </p>
                      </div>
                      <h3 className="text-sm font-medium text-[#6D7C8D] dark:text-gray-400 mb-1">
                        Vote Power
                      </h3>
                    </div>
                    <div className="bg-[#F9FAFB] dark:bg-[#17212B] p-4 rounded-lg border border-[#efefef] dark:border-[#232F3B]">
                      <div className="flex items-center space-x-2 mb-2">
                        <img
                          src="/logo.png"
                          alt=""
                          className="h-5 w-5 rounded-full"
                        />
                        <p className="text-2xl font-bold text-[#030303] dark:text-white">
                          {profile?.totalDelegations || 0}
                        </p>
                      </div>
                      <h3 className="text-sm font-medium text-[#6D7C8D] dark:text-gray-400 mb-1">
                        Delegations
                      </h3>
                    </div>
                    <div className="bg-[#F9FAFB] dark:bg-[#17212B] p-4 rounded-lg border border-[#efefef] dark:border-[#232F3B]">
                      <div className="flex items-center space-x-2 mb-2">
                        <img
                          src="/logo.png"
                          alt=""
                          className="h-5 w-5 rounded-full"
                        />
                        <p className="text-2xl font-bold text-[#030303] dark:text-white">
                          0
                        </p>
                      </div>
                      <h3 className="text-sm font-medium text-[#6D7C8D] dark:text-gray-400 mb-1">
                        Staked
                      </h3>
                    </div>
                    <div className="bg-[#F9FAFB] dark:bg-[#17212B] p-4 rounded-lg border border-[#efefef] dark:border-[#232F3B]">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <img
                            src="/logo.png"
                            alt=""
                            className="h-5 w-5 rounded-full"
                          />
                          <p className="text-2xl font-bold text-[#030303] dark:text-white">
                            {profile?.rewards || "0"}
                          </p>
                        </div>
                        {Number(profile?.rewards || 0) > 0 && (
                          <button
                            onClick={handleClaimRewards}
                            disabled={isClaiming}
                            className="transition-all duration-200 font-semibold transform hover:scale-105 active:scale-95 text-xs bg-[#10b981] dark:bg-white text-white dark:text-[#0D131A] px-3 py-1.5 text-center rounded-full flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isClaiming ? (
                              <svg
                                className="animate-spin h-4 w-4"
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
                              "Claim"
                            )}
                          </button>
                        )}
                      </div>
                      <h3 className="text-sm font-medium text-[#6D7C8D] dark:text-gray-400 mb-1">
                        Rewards
                      </h3>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>

            <motion.div
              className="mb-4"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.2, delay: 0.1 }}
            >
              <Tabs
                defaultValue="proposals"
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-lg font-bold text-[#030303] dark:text-white mb-[-6px]">
                    Activity
                  </h2>
                  <TabsList className="bg-white dark:bg-[#1D2833] border border-[#efefef] dark:border-[#232F3B] p-1 rounded-full">
                    <TabsTrigger
                      value="proposals"
                      className="rounded-full text-xs font-semibold data-[state=active]:bg-[#EFF2F5] dark:data-[state=active]:bg-[#2d3d4d] data-[state=active]:text-[#030303] dark:data-[state=active]:text-white data-[state=active]:shadow-sm"
                    >
                      Proposals
                    </TabsTrigger>
                    <TabsTrigger
                      value="delegations"
                      className="rounded-full text-xs font-semibold data-[state=active]:bg-[#EFF2F5] dark:data-[state=active]:bg-[#2d3d4d] data-[state=active]:text-[#030303] dark:data-[state=active]:text-white data-[state=active]:shadow-sm"
                    >
                      Delegations
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="proposals" className="space-y-4">
                  {isProposalsLoading ? (
                    <div className="bg-white dark:bg-[#17212B] rounded-md border border-[#efefef] dark:border-[#232F3B] overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full" role="table">
                          <thead
                            className="bg-[#F9FAFB] dark:bg-[#17212B]"
                            role="rowgroup"
                          >
                            <tr role="row">
                              <th
                                scope="col"
                                className="px-6 py-3 text-sm font-semibold text-left text-[#6D7C8D] dark:text-[#6D7C8D]"
                              >
                                <div className="flex items-center justify-start">
                                  Proposal
                                  <ChevronsUpDown className="ml-1 h-4 w-4 text-[#6D7C8D]" />
                                </div>
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-sm font-semibold text-left text-[#6D7C8D] dark:text-[#6D7C8D]"
                              >
                                <div className="flex items-center justify-start">
                                  For
                                  <ChevronsUpDown className="ml-1 h-4 w-4 text-[#6D7C8D]" />
                                </div>
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-sm font-semibold text-left text-[#6D7C8D] dark:text-[#6D7C8D]"
                              >
                                <div className="flex items-center justify-start">
                                  Against
                                  <ChevronsUpDown className="ml-1 h-4 w-4 text-[#6D7C8D]" />
                                </div>
                              </th>
                              <th
                                scope="col"
                                className="px-6 py-3 text-sm font-semibold text-left text-[#6D7C8D] dark:text-[#6D7C8D]"
                              >
                                <div className="flex items-center justify-start">
                                  Vote
                                  <ChevronsUpDown className="ml-1 h-4 w-4 text-[#6D7C8D]" />
                                </div>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {[1, 2, 3].map((_, index) => (
                              <tr
                                key={index}
                                className="border-b dark:border-b-[#232F3B] border-b-[#efefef]"
                              >
                                <td className="px-6 py-4">
                                  <div className="flex flex-col">
                                    <div className="h-5 w-3/4 bg-gray-200 dark:bg-[#33475b] rounded-md animate-pulse mb-2"></div>
                                    <div className="flex items-center mt-1 space-x-2">
                                      <div className="h-4 w-16 bg-gray-200 dark:bg-[#33475b] rounded-full animate-pulse"></div>
                                      <div className="h-4 w-20 bg-gray-200 dark:bg-[#33475b] rounded-md animate-pulse"></div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="h-4 w-16 bg-gray-200 dark:bg-[#33475b] rounded-md animate-pulse"></div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="h-4 w-16 bg-gray-200 dark:bg-[#33475b] rounded-md animate-pulse"></div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="h-5 w-16 bg-gray-200 dark:bg-[#33475b] rounded-full animate-pulse"></div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : proposals.length > 0 ? (
                    <>
                      <div className="bg-white dark:bg-[#17212B] rounded-md border border-[#efefef] dark:border-[#232F3B] overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full" role="table">
                            <thead
                              className="bg-[#F9FAFB] dark:bg-[#17212B]"
                              role="rowgroup"
                            >
                              <tr role="row">
                                <th
                                  scope="col"
                                  className="px-6 py-3 text-sm font-semibold text-left text-[#6D7C8D] dark:text-[#6D7C8D]"
                                >
                                  <div className="flex items-center justify-start cursor-pointer">
                                    Proposal
                                    <ChevronsUpDown className="ml-1 h-4 w-4 text-[#6D7C8D]" />
                                  </div>
                                </th>
                                <th
                                  scope="col"
                                  className="px-6 py-3 text-sm font-semibold text-left text-[#6D7C8D] dark:text-[#6D7C8D]"
                                >
                                  <div className="flex items-center justify-start cursor-pointer">
                                    For
                                    <ChevronsUpDown className="ml-1 h-4 w-4 text-[#6D7C8D]" />
                                  </div>
                                </th>
                                <th
                                  scope="col"
                                  className="px-6 py-3 text-sm font-semibold text-left text-[#6D7C8D] dark:text-[#6D7C8D]"
                                >
                                  <div className="flex items-center justify-start cursor-pointer">
                                    Against
                                    <ChevronsUpDown className="ml-1 h-4 w-4 text-[#6D7C8D]" />
                                  </div>
                                </th>
                                <th
                                  scope="col"
                                  className="px-6 py-3 text-sm font-semibold text-left text-[#6D7C8D] dark:text-[#6D7C8D]"
                                >
                                  <div className="flex items-center justify-start cursor-pointer">
                                    Vote
                                    <ChevronsUpDown className="ml-1 h-4 w-4 text-[#6D7C8D]" />
                                  </div>
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {currentProposals.map((proposal, index) => (
                                <motion.tr
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{
                                    duration: 0.3,
                                    delay: index * 0.05,
                                  }}
                                  key={proposal.id}
                                  className="border-b dark:border-b-[#232F3B] border-b-[#efefef] cursor-pointer dark:bg-[#1D2833] hover:bg-[#f9f9f9] dark:hover:bg-[#24313d] transition-colors duration-150"
                                >
                                  <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                      <div className="text-sm font-semibold text-[#030303] dark:text-white">
                                        {proposal.title}
                                      </div>
                                      <div className="flex items-center mt-1 space-x-2">
                                        {getStatusBadge(proposal.status)}
                                        <span className="text-xs text-[#6D7C8D] dark:text-gray-400">
                                          {proposal.date}
                                        </span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                                      {proposal.votesFor.toLocaleString()}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                                      {proposal.votesAgainst.toLocaleString()}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#6D7C8D] dark:text-gray-400">
                                    {proposal.voted ? (
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                        Yes
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400">
                                        No vote
                                      </span>
                                    )}
                                  </td>
                                </motion.tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Pagination */}
                      {proposals.length > itemsPerPage && (
                        <div className="flex justify-center mt-6">
                          <div className="flex items-center space-x-[6px]">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => paginate(currentPage - 1)}
                              disabled={currentPage === 1}
                              className="bg-white dark:bg-[#1D2833] border-[#efefef] dark:border-[#232F3B]"
                            >
                              <ChevronLeft className="h-4 w-4 mr-1" />
                              Previous
                            </Button>
                            {Array.from({
                              length: Math.ceil(
                                proposals.length / itemsPerPage
                              ),
                            }).map((_, index) => (
                              <Button
                                key={index + 1}
                                variant="outline"
                                size="sm"
                                onClick={() => paginate(index + 1)}
                                className={`px-3 py-1 ${
                                  currentPage === index + 1
                                    ? "bg-[#10b981] font-semibold text-white dark:text-white hover:bg-emerald-600 hover:text-white"
                                    : "bg-white dark:bg-[#1D2833] border-[#efefef] dark:border-[#232F3B]"
                                }`}
                              >
                                {index + 1}
                              </Button>
                            ))}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => paginate(currentPage + 1)}
                              disabled={
                                currentPage ===
                                Math.ceil(proposals.length / itemsPerPage)
                              }
                              className="bg-white dark:bg-[#1D2833] border-[#efefef] dark:border-[#232F3B]"
                            >
                              Next
                              <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="bg-white dark:bg-[#1D2833] rounded-lg shadow-sm p-8 text-center border border-[#efefef] dark:border-[#232F3B]">
                      <div className="p-3 bg-[#EFF2F5] dark:bg-[#293846] rounded-full mx-auto mb-3 w-fit">
                        <TrendingUp className="h-6 w-6 text-[#030303] dark:text-white" />
                      </div>
                      <h2 className="text-lg font-semibold text-[#030303] dark:text-white">
                        No Voting History
                      </h2>
                      <p className="text-[#6D7C8D] font-medium dark:text-gray-400 mb-4 max-w-sm mx-auto">
                        Voting history is currently untracked
                      </p>
                      <a
                        href="https://www.tally.xyz/gov/compound/proposals"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-[#EFF2F5] dark:bg-white text-[#0D131A] dark:text-[#0D131A] transition-all duration-200 transform hover:scale-105 active:scale-95 px-6 py-2 rounded-full hover:bg-[#10b981] hover:text-white dark:hover:text-white font-semibold inline-flex items-center text-sm mb-2"
                      >
                        View Proposals
                      </a>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="delegations" className="space-y-4">
                  {isDelegationsLoading ? (
                    <div className="space-y-4">
                      {[1, 2].map((_, index) => (
                        <div
                          key={index}
                          className="p-4 bg-white dark:bg-[#1D2833] rounded-lg shadow-sm border border-[#efefef] dark:border-[#232F3B]"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 bg-gray-200 dark:bg-[#33475b] rounded-full animate-pulse"></div>
                            <div className="flex-1">
                              <div className="h-5 w-40 bg-gray-200 dark:bg-[#33475b] rounded-md animate-pulse mb-2"></div>
                              <div className="h-4 w-32 bg-gray-200 dark:bg-[#33475b] rounded-md animate-pulse"></div>
                            </div>
                            <div className="ml-auto h-4 w-20 bg-gray-200 dark:bg-[#33475b] rounded-md animate-pulse"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : delegations.length > 0 ? (
                    <div className="space-y-4">
                      {delegations.map((delegation, index) => (
                        <div
                          key={index}
                          className="p-4 bg-white dark:bg-[#1D2833] rounded-lg shadow-sm cursor-pointer hover:bg-[#f9f9f9] dark:hover:bg-[#24313d] transition-colors duration-150 border border-[#efefef] dark:border-[#232F3B]"
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
                                  "/placeholder.svg?height=48&width=48" ||
                                  "/placeholder.svg" ||
                                  "/placeholder.svg" ||
                                  "/placeholder.svg" ||
                                  "/placeholder.svg" ||
                                  "/placeholder.svg"
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
                    <div className="bg-white dark:bg-[#1D2833] rounded-lg shadow-sm p-8 text-center border border-[#efefef] dark:border-[#232F3B]">
                      <div className="p-3 bg-[#EFF2F5] dark:bg-[#293846] rounded-full mx-auto mb-3 w-fit">
                        <Users className="h-6 w-6 text-[#030303] dark:text-white" />
                      </div>
                      <h2 className="text-lg font-semibold text-[#030303] dark:text-white">
                        No Delegations
                      </h2>
                      <p className="text-[#6D7C8D] dark:text-gray-400 mb-4 max-w-sm mx-auto">
                        Delegations are currently untracked
                      </p>
                      <Link
                        href="/explore"
                        className="bg-[#EFF2F5] dark:bg-white text-[#0D131A] dark:text-[#0D131A] transition-all duration-200 transform hover:scale-105 active:scale-95 px-6 py-2 rounded-full hover:bg-[#10b981] hover:text-white dark:hover:text-white font-semibold inline-flex items-center text-sm mb-2"
                      >
                        Find Delegates
                      </Link>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
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
                          onFocus={() => setIsProfileNameFocused(true)}
                          onBlur={() => setIsProfileNameFocused(false)}
                          className="absolute font-semibold pb-2 inset-0 h-full p-3 px-4 rounded-lg w-full transition-all bg-[#EFF2F5] dark:bg-[#1D2833] border border-[#efefef] dark:border-[#28303e] text-[#030303] dark:text-white outline-none focus:border-emerald-300 dark:focus:border-emerald-700"
                          autoFocus
                        />
                        <label
                          htmlFor="profileName"
                          className={`absolute left-4 pointer-events-none transition-all duration-200 ${
                            isProfileNameFocused || profileName
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
                          onFocus={() => setIsDelegateAddressFocused(true)}
                          onBlur={() => setIsDelegateAddressFocused(false)}
                          className="absolute font-semibold pb-2 inset-0 h-full p-3 px-4 rounded-lg w-full transition-all bg-[#EFF2F5] dark:bg-[#1D2833] border border-[#efefef] dark:border-[#28303e] text-[#030303] dark:text-white outline-none focus:border-emerald-300 dark:focus:border-emerald-700"
                        />
                        <label
                          htmlFor="delegateAddress"
                          className={`absolute left-4 pointer-events-none transition-all duration-200 ${
                            isDelegateAddressFocused || delegateAddress
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
                          onFocus={() => setIsAprFocused(true)}
                          onBlur={() => setIsAprFocused(false)}
                          className="absolute font-semibold pb-2 inset-0 h-full p-3 px-4 rounded-lg w-full transition-all bg-[#EFF2F5] dark:bg-[#1D2833] border border-[#efefef] dark:border-[#28303e] text-[#030303] dark:text-white outline-none focus:border-emerald-300 dark:focus:border-emerald-700"
                        />
                        <label
                          htmlFor="apr"
                          className={`absolute left-4 pointer-events-none transition-all duration-200 ${
                            isAprFocused || apr
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
                          onFocus={() => setIsFundingAmountFocused(true)}
                          onBlur={() => setIsFundingAmountFocused(false)}
                          className="absolute font-semibold pb-2 inset-0 h-full p-3 px-4 rounded-lg w-full transition-all bg-[#EFF2F5] dark:bg-[#1D2833] border border-[#efefef] dark:border-[#28303e] text-[#030303] dark:text-white outline-none focus:border-emerald-300 dark:focus:border-emerald-700"
                        />
                        <label
                          htmlFor="fundingAmount"
                          className={`absolute left-4 pointer-events-none transition-all duration-200 ${
                            isFundingAmountFocused || fundingAmount
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
                    } transition-all duration-200 font-semibold transform hover:scale-105 active:scale-95 w-full text-sm bg-[#10b981] text-white py-3 text-center rounded-full flex justify-center items-center mt-4`}
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
          </div>
        </motion.main>
        <Footer />
      </div>
  );
}
