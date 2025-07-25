"use client";

import Modal from "@/components/common/Modal";
import Footer from "@/components/Footer";
import Header from "@/components/MainLayout/Header";
import { compoundTokenContractInfo } from "@/constants";
import {
  delegatesData,
  findDelegateBySlug,
  formatNameForDisplay,
  type Delegate,
} from "@/lib/delegate-data";
import { compensatorService } from "@/services/compensator";
import { useSettingTheme } from "@/store/setting/selector";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import blockies from "ethereum-blockies-png";
import { formatUnits, isAddress } from "ethers";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Copy, TrendingUp, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Headroom from "react-headroom";
import toast from "react-hot-toast";
import {
  useAccount,
  useReadContract,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { mainnet } from "wagmi/chains";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Proposal {
  title: string;
  status: string;
  date: string;
  votesFor: number;
  votesAgainst: number;
  voted?: boolean;
  voteDirection?: "for" | "against" | null;
}

interface Delegation {
  delegator: string;
  amount: string;
  date: string;
}

export default function DelegatePage() {
  const theme = useSettingTheme();
  const params = useParams();
  const delegateSlug = params.slug as string;
  const { openConnectModal } = useConnectModal();
  const { switchChainAsync } = useSwitchChain();

  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [amount, setAmount] = useState<string>("");

  const [delegate, setDelegate] = useState<Delegate | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [delegations, setDelegations] = useState<Delegation[]>([]);

  const [isDelegateLoading, setIsDelegateLoading] = useState<boolean>(true);
  const [isProposalsLoading, setIsProposalsLoading] = useState<boolean>(true);
  const [isDelegationsLoading, setIsDelegationsLoading] =
    useState<boolean>(true);
  const [listDelegatesFormFactory, setListDelegatesFromServer] = useState<any[]>([]);

  const handleGetDelegatesFromServer = async () => {
    try {
      const compensators = await compensatorService.getAllCompensators();
      const delegates = compensators.map((compensator: any) => {
        const dataURL = blockies.createDataURL({
          seed: compensator?.address || compensator?.owner,
        });
        return {
          name: compensator?.name || "Unknown Delegate",
          address: compensator?.address,
          votingPower: Number(compensator?.votingPower || 0),
          distributed: compensator?.totalStakes || 0,
          totalDelegations: 0,
          performance7D: 0,
          rewardAPR: "0.00%",
          image: dataURL,
          isServer: true,
          id: compensator?.address,
        };
      });
      setListDelegatesFromServer(delegates);
    } catch (error) {
      console.log("error :>> ", error);
      toast.error("Failed to load delegates from server", {
        style: {
          fontWeight: "600",
        },
      });
    }
  };

  useEffect(() => {
    handleGetDelegatesFromServer();
  }, []);

  const { address } = useAccount();

  const currentDelegate: any = [
    ...delegatesData,
    ...listDelegatesFormFactory,
  ].find((item) => item.address === delegateSlug);

  const { data: compBalance, refetch: refetchCompBalance } = useReadContract({
    address: compoundTokenContractInfo.address as `0x${string}`,
    abi: compoundTokenContractInfo.abi,
    functionName: "balanceOf",
    args: address ? [address as `0x${string}`] : undefined,
  });

  const formattedCompBalance = compBalance
    ? parseFloat(formatUnits((compBalance || "0").toString(), 18)).toFixed(4)
    : "0.0000";

  const { writeContractAsync } = useWriteContract();

  const truncateAddressMiddle = (
    address: string,
    startChars = 6,
    endChars = 4
  ) => {
    if (!address) return "";
    if (address.length <= startChars + endChars) return address;

    const start = address.substring(0, startChars);
    const end = address.substring(address.length - endChars);

    return `${start}..${end}`;
  };

  // Mock data fetching
  useEffect(() => {
    fetchDelegateData();
    fetchProposals();
    fetchDelegations();
  }, [delegateSlug]);

  // Simulate fetching delegate data
  const fetchDelegateData = async () => {
    setIsDelegateLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1200));

      // Find the delegate from our shared data
      const foundDelegate = findDelegateBySlug(delegateSlug);

      if (foundDelegate) {
        setDelegate({
          ...foundDelegate,
          bio: "Compound delegate",
          status: "Active",
          votingPower: 0,
          totalDelegations: 0,
          activeProposals: 0,
          rating: 0,
        });
      } else {
        // Fallback if delegate not found
        const delegateName = delegateSlug
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");

        setDelegate({
          id: 0,
          name: delegateName,
          address: "0x5898...4848",
          image: "/logo.png",
          rewardAPR: "0.00%",
          bio: "Compound delegate",
          status: "Active",
          votingPower: 0,
          totalDelegations: 0,
          activeProposals: 0,
          rating: 0,
        });
      }

      setIsDelegateLoading(false);
    } catch (error) {
      setIsError(true);
      setErrorMessage("Failed to load delegate data. Please try again.");
      setIsDelegateLoading(false);
    }
  };

  // Simulate fetching proposals
  const fetchProposals = async () => {
    setIsProposalsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1800));

      // Mock data
      setProposals([]); // Empty array to simulate no proposals
      setIsProposalsLoading(false);
    } catch (error) {
      setIsError(true);
      setErrorMessage("Failed to load proposals. Please try again.");
      setIsProposalsLoading(false);
    }
  };

  // Simulate fetching delegations
  const fetchDelegations = async () => {
    setIsDelegationsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Mock data
      setDelegations([]); // Empty array to simulate no delegations
      setIsDelegationsLoading(false);
    } catch (error) {
      setIsError(true);
      setErrorMessage("Failed to load delegations. Please try again.");
      setIsDelegationsLoading(false);
    }
  };

  // Handle retry on error
  const handleRetry = () => {
    setIsError(false);
    setErrorMessage("");

    if (isDelegateLoading || !delegate) fetchDelegateData();
    if (isProposalsLoading || proposals.length === 0) fetchProposals();
    if (isDelegationsLoading || delegations.length === 0) fetchDelegations();
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsModalOpen(false);
    setAmount("");
  };

  // Handle delegate submit
  const handleDelegateSubmit = async () => {
    setLoading(true);

    try {
      if (!address) {
        openConnectModal?.();
        toast.error("Please connect your wallet first", {
          style: {
            fontWeight: "600",
          },
        });
        return;
      }

      if (!currentDelegate || !amount || Number.parseFloat(amount) <= 0) {
        toast.error("Please enter a valid amount", {
          style: {
            fontWeight: "600",
          },
        });
        throw new Error("Invalid amount or delegate");
      }

      if (!currentDelegate?.address || !isAddress(currentDelegate?.address)) {
        toast.error("Invalid delegate address", {
          style: {
            fontWeight: "600",
          },
        });
        throw new Error("Invalid delegate address");
      }

      toast.success("Switching to mainnet...", {
        style: {
          fontWeight: "600",
        },
      });
      await switchChainAsync({ chainId: mainnet.id });
      const delegateAddress = currentDelegate?.address as `0x${string}`;

      toast.success("Submitting delegation transaction...", {
        style: {
          fontWeight: "600",
        },
      });

      await writeContractAsync({
        address: compoundTokenContractInfo.address as `0x${string}`,
        abi: compoundTokenContractInfo.abi,
        functionName: "delegate",
        args: [delegateAddress],
      });

      toast.success(`Successfully delegated to ${currentDelegate?.name}!`, {
        style: {
          fontWeight: "600",
        },
      });
      handleModalClose();
      refetchCompBalance();
    } catch (error) {
      console.error("Error delegating COMP:", error);
      toast.error("Failed to delegate COMP. Please try again.", {
        style: {
          fontWeight: "600",
        },
      });
    } finally {
      setLoading(false);
    }
  };

  // Copy address to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Address copied to clipboard", {
      style: {
        fontWeight: "600",
      },
    });
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
          {/* Error Message */}
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

          <div className="mx-auto max-w-[1100px] w-full p-4 pt-8">
            {/* Delegate Profile Section */}
            <motion.div
              className="mb-4 bg-white dark:bg-[#1D2833] p-6 rounded-lg shadow-sm border border-[#efefef] dark:border-[#232F3B]"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {isDelegateLoading ? (
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
              ) : delegate ? (
                <>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center">
                        <Image
                          src={currentDelegate?.image || "/logo.png"}
                          alt={currentDelegate?.name || "Delegate"}
                          width={64}
                          height={64}
                          className="rounded-full"
                        />
                      </div>
                      <div>
                        <h1 className="text-2xl font-bold text-[#030303] dark:text-white">
                          {currentDelegate?.name}
                        </h1>
                        <div className="flex items-center mt-1">
                          <p className="text-sm text-[#6D7C8D] dark:text-gray-400">
                            {truncateAddressMiddle(currentDelegate?.address)}
                          </p>
                          <button
                            onClick={() =>
                              copyToClipboard(currentDelegate?.address || "")
                            }
                            className="ml-2 text-[#6D7C8D] hover:text-[#030303] dark:hover:text-gray-300"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setIsModalOpen(true)}
                        className="transition-all duration-200 font-semibold transform hover:scale-105 active:scale-95 w-full text-sm bg-[#10b981] dark:bg-white text-white dark:text-[#0D131A] px-4 py-[9px] text-center rounded-full flex justify-center items-center"
                      >
                        Delegate COMP
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-[54px]">
                    <div className="bg-[#F9FAFB] dark:bg-[#17212B] p-4 rounded-lg border border-[#efefef] dark:border-[#232F3B]">
                      <div className="flex items-center space-x-2 mb-2">
                        <img
                          src="/logo.png"
                          alt=""
                          className="h-5 w-5 rounded-full"
                        />
                        <p className="text-2xl font-bold text-[#030303] dark:text-white">
                          {currentDelegate?.votingPower || "0"}
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
                          {currentDelegate?.totalDelegations || 0}
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
                          {Number(currentDelegate?.distributed || "0") === 0 ? "0" : Number(currentDelegate?.distributed || "0").toFixed(2)}
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
                            {Number(currentDelegate?.rewardRate || 0) === 0 ? "0%" : `${Number(currentDelegate?.rewardRate || 0).toFixed(2)}%`}
                          </p>
                        </div>
                      </div>
                      <h3 className="text-sm font-medium text-[#6D7C8D] dark:text-gray-400 mb-1">
                        Reward Rate
                      </h3>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center p-8">
                  <p className="text-[#6D7C8D] dark:text-gray-400">
                    No delegate data available
                  </p>
                </div>
              )}
            </motion.div>

            {/* History and Delegations Section */}
            <motion.div
              className="mb-4"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.2, delay: 0.1 }}
            >
              <Tabs defaultValue="history" className="w-full">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-lg font-bold text-[#030303] dark:text-white mb-[-6px]">
                    Activity
                  </h2>
                  <TabsList className="bg-white dark:bg-[#1D2833] border border-[#efefef] dark:border-[#232F3B] p-1 rounded-full">
                    <TabsTrigger
                      value="history"
                      className="rounded-full text-xs font-semibold data-[state=active]:bg-[#EFF2F5] dark:data-[state=active]:bg-[#2d3d4d] data-[state=active]:text-[#030303] dark:data-[state=active]:text-white data-[state=active]:shadow-sm"
                    >
                      History
                    </TabsTrigger>
                    <TabsTrigger
                      value="delegations"
                      className="rounded-full text-xs font-semibold data-[state=active]:bg-[#EFF2F5] dark:data-[state=active]:bg-[#2d3d4d] data-[state=active]:text-[#030303] dark:data-[state=active]:text-white data-[state=active]:shadow-sm"
                    >
                      Delegations
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="history" className="space-y-4">
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
                                {(proposal.votesFor + proposal.votesAgainst).toFixed(2)}K
                              </p>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-[#33475b] rounded-full h-1.5">
                              <div
                                className="bg-emerald-500 h-1.5 rounded-full"
                                style={{
                                  width: `${
                                    (proposal.votesFor /
                                      (proposal.votesFor + proposal.votesAgainst)) *
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
                                Voted {proposal.voteDirection === "for" ? "For" : "Against"}
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
                      <p className="text-[#6D7C8D] font-medium dark:text-gray-400 mb-3 max-w-md mx-auto">
                        Voting history is currently untracked
                      </p>
                      {currentDelegate?.externalLink && (
                        <a
                          href={currentDelegate.externalLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-[#EFF2F5] dark:bg-white text-[#0D131A] dark:text-[#0D131A] transition-all duration-200 transform hover:scale-105 active:scale-95 px-6 py-2 rounded-full hover:bg-[#10b981] hover:text-white dark:hover:text-[#0D131A] font-semibold inline-flex items-center text-sm mb-2"
                        >
                          View Proposals
                        </a>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="delegations" className="space-y-4">
                  {isDelegationsLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((_, index) => (
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
                          className="p-4 bg-white dark:bg-[#1D2833] rounded-lg shadow-sm"
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative h-12 w-12 flex-shrink-0 rounded-full overflow-hidden">
                              <Image
                                src="/placeholder.svg?height=48&width=48"
                                alt="Delegator"
                                width={48}
                                height={48}
                                className="object-cover"
                              />
                            </div>
                            <div>
                              <p className="text-base font-semibold text-[#030303] dark:text-white">
                                {delegation.delegator}
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
                        No Delegations
                      </h2>
                      <p className="text-[#6D7C8D] font-medium dark:text-gray-400 mb-3 max-w-md mx-auto">
                        Delegations are currently untracked
                      </p>
                      <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-[#EFF2F5] dark:bg-white text-[#0D131A] dark:text-[#0D131A] transition-all duration-200 transform hover:scale-105 active:scale-95 px-6 py-2 rounded-full hover:bg-[#10b981] hover:text-white dark:hover:text-white font-semibold inline-flex items-center text-sm mb-2"
                      >
                        Delegate COMP
                      </button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </motion.div>
          </div>
        </motion.main>
        <Footer />

        {/* Delegate Modal */}
        {isModalOpen && delegate && (
        <Modal handleClose={handleModalClose} open={isModalOpen}>
          <div className="">
            <div className="relative h-14 w-14 flex-shrink-0 mb-4 rounded-full overflow-hidden">
              <Image
                src={delegate.image || "/placeholder.svg"}
                alt={delegate.name}
                width={56}
                height={56}
                className="object-cover"
                unoptimized
              />
            </div>
            <h2 className="text-xl font-semibold mb-4 dark:text-white">
              Delegate COMP to {currentDelegate?.name}
            </h2>
            <div className="relative mb-4">
              <div className="flex flex-col space-y-2">
                <div className="flex flex-col border bg-[#EFF2F5] dark:bg-[#1D2833] border-[#efefef] dark:border-[#2e3746] rounded-lg h-20 p-3">
                  <div className="flex items-center justify-between mt-[-6px]">
                    <input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-transparent dark:text-gray-100 focus:outline-none text-xl font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <div className="flex items-center mr-3 ml-2">
                      <button 
                        onClick={() => setAmount(formattedCompBalance)}
                        className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#E5E7EB] dark:bg-[#2d3d4d] text-[#374151] dark:text-white hover:bg-[#D1D5DB] dark:hover:bg-[#3d4d5d] transition-colors mr-2"
                      >
                        MAX
                      </button>
                      <div className="flex items-center">
                        <Image
                          src="/logo.png"
                          alt="COMP Logo"
                          width={20}
                          height={20}
                          className="mx-auto rounded-full"
                        />
                        <span className="px-1 py-2 dark:text-gray-200 rounded text-sm font-semibold">
                          COMP
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs font-medium text-[#6D7C8D]">$0.00</p>
                    <p className="text-xs font-medium text-[#6D7C8D] flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                        <path d="M2.273 5.625A4.483 4.483 0 015.25 4.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0018.75 3H5.25a3 3 0 00-2.977 2.625zM2.273 8.625A4.483 4.483 0 015.25 7.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0018.75 6H5.25a3 3 0 00-2.977 2.625zM5.25 9a3 3 0 00-3 3v6a3 3 0 003 3h13.5a3 3 0 003-3v-6a3 3 0 00-3-3H15a.75.75 0 01-.75-.75 1.5 1.5 0 00-1.5-1.5H9a1.5 1.5 0 00-1.5 1.5A.75.75 0 016 9H5.25z" />
                      </svg>
                      {formattedCompBalance}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[25, 50, 75, 100].map((percent) => (
                <button
                  key={percent}
                  onClick={() => {
                    const balance = Number(
                      formatUnits((compBalance || "0").toString(), 18)
                    ); // Convert balance to a number
                    const selectedAmount = (percent / 100) * balance; // Calculate the selected amount
                    setAmount(selectedAmount.toFixed(4)); // Set the amount with 4 decimal places
                  }}
                  className="py-[4px] border font-medium border-[#efefef] dark:border-[#2e3746] rounded-full text-sm hover:bg-[#EFF2F5] dark:hover:bg-gray-800 dark:text-gray-200 transition-colors"
                >
                  {percent}%
                </button>
              ))}
            </div>
            <button
              onClick={handleDelegateSubmit}
              disabled={
                !amount ||
                Number.parseFloat(amount) <= 0 ||
                Number.parseFloat(amount) > Number(compBalance || 0) ||
                loading
              }
              className={`${
                loading ||
                !amount ||
                Number.parseFloat(amount) <= 0 ||
                Number.parseFloat(amount) > Number(compBalance || 0)
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-emerald-600"
              } transition-all duration-200 font-semibold transform hover:scale-105 active:scale-95 w-full text-sm bg-[#10b981] text-white py-3 text-center rounded-full flex justify-center items-center ${
                Number.parseFloat(amount) > Number(compBalance || 0)
                  ? "bg-red-500 hover:bg-red-600"
                  : ""
              }`}
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
              ) : Number.parseFloat(amount) > Number(compBalance || 0) ? (
                "Insufficient Balance"
              ) : (
                "Delegate COMP"
              )}
            </button>
            <div className="flex justify-between items-center mt-4 text-sm font-medium text-[#6D7C8D]">
              <div className="">Reward APR</div>
              <div className="">{currentDelegate?.rewardAPR}</div>
            </div>
            <div className="flex justify-between items-center mt-4 text-sm font-medium text-[#6D7C8D]">
              <div className="">Delegated votes</div>
              <div className="">
                {Number(currentDelegate?.distributed || "0").toFixed(2)} COMP
              </div>
            </div>
            <div className="flex justify-between items-center mt-4 text-sm font-medium text-[#6D7C8D]">
              <div className="">Last active</div>
              <div className="">7 days ago</div>
            </div>
            <div className="flex justify-between items-center mt-4 text-sm font-medium text-[#6D7C8D]">
              <div className="">Profile</div>
              <Link
                href={`/delegate/${delegateSlug}`}
                className="text-sm lowercase cursor-pointer font-medium text-emerald-600 dark:text-emerald-500 focus:outline-none"
              >
                @{formatNameForDisplay(currentDelegate?.name)}
              </Link>
            </div>
          </div>
        </Modal>
      )}
      </div>
  );
}
// Make this page dynamic to prevent SSR issues with Wagmi
export const dynamic = 'force-dynamic';

