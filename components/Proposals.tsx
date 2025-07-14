"use client";

import Modal from "@/components/common/Modal";
import { compoundTokenContractInfo, compensatorContractInfo } from "@/constants";
import { getEthersSigner } from "@/hooks/useEtherProvider";
import { useGetCompoundContract } from "@/hooks/useGetCompContract";
import { useCompensatorService } from "@/hooks/useCompensatorService";
import { delegatesData } from "@/lib/delegate-data";

import { wagmiConfig } from "@/app/providers";
import { waitForTransactionReceipt } from "@wagmi/core";

import BigNumber from "bignumber.js";
import { ethers, formatUnits } from "ethers";
import { ArrowLeft, ArrowRight, ThumbsDown, ThumbsUp, ChevronDown, Users } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import "swiper/css";
import "swiper/css/free-mode";
import { FreeMode, Navigation } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import { useAccount, useReadContract } from "wagmi";
import { motion, AnimatePresence, easeInOut } from "framer-motion";

const proposals = [
  {
    id: 1,
    proposalId: 422,
    title: "[Gauntlet] - Interest Rate Curve Recommendations (03/25)",
    status: "Pending",
    createdAt: "2025-03-25",
    popularity: 120,
  },
  {
    id: 2,
    proposalId: 421,
    title: "[Gauntlet] - Cap recommendations (03/24/25)",
    status: "Active",
    createdAt: "2025-03-24",
    popularity: 120,
  },
  {
    id: 3,
    proposalId: 420, 
    title: "Initialize cWETHv3 on Ronin",
    status: "Pending",
    createdAt: "2025-03-18",
    popularity: 80,
  },
  {
    id: 4,
    proposalId: 419, 
    title: "Add wsuperOETHb as collateral into cWETHv3 on Base",
    status: "Pending",
    createdAt: "2025-03-14",
    popularity: 150,
  },
  {
    id: 5,
    proposalId: 418, 
    title: "Add tETH as collateral into cWETHv3 on Mainnet",
    status: "Executed",
    createdAt: "2025-03-10",
    popularity: 60,
  },
  {
    id: 6,
    proposalId: 423, 
    title: "Renew Proposal Guardian Role for the Community Multisig",
    status: "Executed",
    createdAt: "2025-03-11",
    popularity: 200,
  },
  {
    id: 7,
    proposalId: 417, 
    title: "[Gauntlet] - Rewards Top Up for Ethereum, Base and Optimism (10/3/25)",
    status: "Executed",
    createdAt: "2025-03-10",
    popularity: 200,
  },
  {
    id: 8,
    proposalId: 415, 
    title: "Add weETH as collateral into cUSDTv3 on Mainnet",
    status: "Executed",
    createdAt: "2025-03-06",
    popularity: 200,
  },
];

const Proposals = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<{
    displayId: number;
    proposalId: number;
    title: string;
  } | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<
    "For" | "Against" | null
  >(null);
  const [sortBy, setSortBy] = useState<"stake" | "vote">("stake");
  const [loading, setLoading] = useState(false);
  const navigationPrevRef = useRef(null);
  const navigationNextRef = useRef(null);
  const { address } = useAccount();

  const [amount, setAmount] = useState("");
  const [hasSelectedPercentage, setHasSelectedPercentage] = useState(false);

  const [stakedFor, setStakedFor] = useState(0.0);
  const [stakedAgainst, setStakedAgainst] = useState(0.0);
  const { compoundContract } = useGetCompoundContract();
  const { 
    userCompensatorAddress, 
    userCompensatorInstance, 
    userVotingPower, 
    hasCompensator,
    createCompensator,
    refreshUserData 
  } = useCompensatorService();

  const [isVoteModalOpen, setIsVoteModalOpen] = useState(false);
  const [selectedVoteProposal, setSelectedVoteProposal] = useState<{
    displayId: number;
    proposalId: number;
    title: string;
  } | null>(null);
  const [selectedVote, setSelectedVote] = useState<"For" | "Against" | null>(null);
  const [voteAmount, setVoteAmount] = useState(0);
  const [availableRewards, setAvailableRewards] = useState<string>("0");

  // New state for delegate selection
  const [selectedDelegate, setSelectedDelegate] = useState<any>(null);
  const [isDelegateDropdownOpen, setIsDelegateDropdownOpen] = useState(false);
  const [userDelegations, setUserDelegations] = useState<any[]>([]);

  const { data: userBalance, refetch: refetchCompBalance } = useReadContract({
    address: compoundTokenContractInfo.address as `0x${string}`,
    abi: compoundTokenContractInfo.abi,
    functionName: "balanceOf",
    args: address ? [address as `0x${string}`] : undefined,
  });

  const formattedCompBalance = parseFloat(
    formatUnits((userBalance || "0").toString(), 18)
  );

  // Get the user's compensator contract address from the service
  useEffect(() => {
    if (address && userCompensatorAddress) {
      // Address is already available from the service
      // Fetch available rewards when compensator address is available
      fetchAvailableRewards();
    }
  }, [address, userCompensatorAddress]);

  // Get contract voting power for the delegate
  const { data: contractVotingPower } = useReadContract({
    address: compoundTokenContractInfo.address as `0x${string}`,
    abi: compoundTokenContractInfo.abi,
    functionName: "getVotes",
    args: userCompensatorAddress ? [userCompensatorAddress as `0x${string}`] : undefined,
  });

  const formattedContractVotingPower = parseFloat(
    formatUnits((contractVotingPower || "0").toString(), 18)
  );

  const compPrice = 41.44;

  const sortedProposals = [...proposals].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleStakeClick = async (proposal: typeof proposals[0], outcome: "For" | "Against") => {


    setSelectedProposal({
      displayId: proposal.id,
      proposalId: proposal.proposalId,
      title: proposal.title
    });
    setSelectedOutcome(outcome);
    setIsModalOpen(true);
    
    // Fetch real stake data for this proposal
    await fetchProposalStakes(proposal.proposalId);
  };

  // Handler for opening vote modal
  const handleVoteClick = (proposal: typeof proposals[0]) => {


    setSelectedVoteProposal({
      displayId: proposal.id,
      proposalId: proposal.proposalId,
      title: proposal.title
    });
    setSelectedVote(null);
    setIsVoteModalOpen(true);
    
    // Fetch available rewards when vote modal opens
    fetchAvailableRewards();
  };

  // Handler for submitting vote through Compensator contract
  // Users vote through the Compensator contract, which then votes on the governor
  // Only the contract owner can actually call castVote on the governor
  const handleSubmitVote = async () => {
    if (!selectedVoteProposal || !selectedVote || !userCompensatorAddress) return;
    
    setLoading(true);
    
    try {
      // Get the user's compensator contract using the service
      const { signer } = await getEthersSigner(wagmiConfig);
      const compensatorContract = new ethers.Contract(
        userCompensatorAddress,
        compensatorContractInfo.abi,
        signer
      );

      // Convert vote direction to number (0 = Against, 1 = For)
      const support = selectedVote === "For" ? 1 : 0;
      
      // Call the Compensator contract's castVote function
      // Note: This will only work if the user is the contract owner
      const { provider } = await getEthersSigner(wagmiConfig);
      const feeData = await provider.getFeeData();
      
      const gas = await compensatorContract.castVote.estimateGas(
        selectedVoteProposal.proposalId,
        support,
        `Vote ${selectedVote} on proposal ${selectedVoteProposal.title}`
      );
      
      const voteReceipt = await compensatorContract.castVote(
        selectedVoteProposal.proposalId,
        support,
        `Vote ${selectedVote} on proposal ${selectedVoteProposal.title}`,
        {
          gasLimit: gas,
          maxFeePerGas: feeData.maxFeePerGas,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        }
      );
      
      const transactionReceipt = await waitForTransactionReceipt(
        wagmiConfig,
        {
          hash: voteReceipt?.hash,
        }
      );
      
      if (transactionReceipt?.status === "success") {
        setIsVoteModalOpen(false);
        toast.success(`Successfully voted ${selectedVote} on proposal ${selectedVoteProposal.title}`);
      }
    } catch (error) {
      console.log("Vote error :>> ", error);
      toast.error("Failed to submit vote. Only the contract owner can vote.", {
        style: {
          fontWeight: "600",
        },
      });
    } finally {
      setLoading(false);
    }
  };

  // Get user's delegations
  useEffect(() => {
    const getUserDelegations = async () => {
      if (address) {
        try {
          // TODO: Implement real delegation fetching from contracts
          // For now, show empty state when no real delegations exist
          setUserDelegations([]);
          setSelectedDelegate(null);
        } catch (error) {
          console.log("Error getting user delegations:", error);
          toast.error("Failed to load delegates", {
            style: {
              fontWeight: "600",
            },
          });
        }
      }
    };
    getUserDelegations();
  }, [address]);

  // Close delegate dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.delegate-dropdown')) {
        setIsDelegateDropdownOpen(false);
      }
    };

    if (isDelegateDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDelegateDropdownOpen]);

  const handleSubmitStake = async (amount: number) => {
    if (!selectedProposal || !selectedOutcome || !selectedDelegate || !userCompensatorAddress) return;
    
    setLoading(true);
    try {
      // Real stake submission logic using the service
      const { signer } = await getEthersSigner(wagmiConfig);
      const compensatorContract = new ethers.Contract(
        userCompensatorAddress,
        compensatorContractInfo.abi,
        signer
      );
      
      if (!compoundContract) {
        return toast.error("Compound contract not found");
      }
      
      const decimals = await compoundContract.decimals();
      const convertAmount = ethers
        .parseUnits(amount ? amount?.toString() : "0", decimals)
        .toString();
      
      const { provider } = await getEthersSigner(wagmiConfig);
      const feeData = await provider.getFeeData();

      // Check allowance
      const allowance = await compoundContract.allowance(
        address,
        userCompensatorAddress
      );
      
      if (new BigNumber(allowance).lt(new BigNumber(convertAmount))) {
        const gas = await compoundContract.approve.estimateGas(
          userCompensatorAddress,
          convertAmount
        );
        const approveReceipt = await compoundContract?.approve(
          userCompensatorAddress,
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
          toast.success("Approval successful");
        }
      }

      // Submit stake
      const gas = await compensatorContract.stakeForProposal.estimateGas(
        selectedProposal.proposalId,
        selectedOutcome === "For" ? 1 : 0,
        convertAmount
      );
      
      const stakeReceipt = await compensatorContract.stakeForProposal(
        selectedProposal.proposalId,
        selectedOutcome === "For" ? 1 : 0,
        convertAmount,
        {
          gasLimit: gas,
          maxFeePerGas: feeData.maxFeePerGas,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        }
      );
      
      const transactionStakeReceipt = await waitForTransactionReceipt(
        wagmiConfig,
        {
          hash: stakeReceipt?.hash,
        }
      );
      
      if (transactionStakeReceipt?.status === "success") {
        toast.success("Stake submitted successfully!");
        setIsModalOpen(false);
        setAmount("");
        setSelectedOutcome(null);
        
        // Update stake amounts
        if (selectedOutcome === "For") {
          setStakedFor((prev) => prev + amount);
        } else {
          setStakedAgainst((prev) => prev + amount);
        }
        
        // Refresh user data
        await refreshUserData();
      }
    } catch (error) {
      console.error("Error submitting stake:", error);
      toast.error("Failed to submit stake. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isModalOpen) {
      setAmount("");
    }
  }, [isModalOpen]);

  // Calculate total stakes for visual bar
  const totalStakes = stakedFor + stakedAgainst;
  const forPercentage = totalStakes > 0 ? (stakedFor / totalStakes) * 100 : 0;
  const againstPercentage = totalStakes > 0 ? (stakedAgainst / totalStakes) * 100 : 0;

  // Fetch real stake data for a proposal
  const fetchProposalStakes = async (proposalId: number) => {
    try {
      if (!userCompensatorAddress) return;
      
      // This would typically come from your backend or contract events
      // For now, we'll set to 0 and let the real data populate
      setStakedFor(0);
      setStakedAgainst(0);
      
      // TODO: Implement real stake fetching logic using the service
      // const stakes = await compensatorService.getProposalTotalStakes(proposalId);
      // setStakedFor(parseFloat(stakes.forStakes));
      // setStakedAgainst(parseFloat(stakes.againstStakes));
    } catch (error) {
      console.error("Error fetching proposal stakes:", error);
      toast.error("Failed to fetch proposal stakes", {
        style: {
          fontWeight: "600",
        },
      });
    }
  };

  // Fetch available rewards from the Compensator contract
  const fetchAvailableRewards = async () => {
    try {
      if (!userCompensatorAddress) {
        setAvailableRewards("0");
        return;
      }

      // Get available rewards from the contract using ethers
      const { signer } = await getEthersSigner(wagmiConfig);
      const compensatorContract = new ethers.Contract(
        userCompensatorAddress,
        compensatorContractInfo.abi,
        signer
      );

      const rewards = await compensatorContract.availableRewards();
      const formattedRewards = parseFloat(formatUnits(rewards.toString(), 18));
      setAvailableRewards(formattedRewards.toFixed(4));
    } catch (error) {
      console.error("Error fetching available rewards:", error);
      setAvailableRewards("0");
      toast.error("Failed to fetch available rewards", {
        style: {
          fontWeight: "600",
        },
      });
    }
  };

  const delegateDropdownVariants = {
    hidden: {
      opacity: 0,
      scale: 0.98,
      y: -3,
      transition: {
        duration: 0.1,
      },
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        stiffness: 500,
        damping: 30,
        mass: 0.5,
        velocity: 5,
      },
    },
  };

  return (
    <div className="w-full mt-3 max-w-[1100px] mx-auto font-sans">
      <div className="mx-auto px-4">
        <div className="flex flex-row justify-between items-center gap-2 mb-4">
          <h2 className="text-[24px] sm:text-2xl font-bold text-[#030303] dark:text-white  mb-[-10px] md:mb-[-12px]">
            Proposals
          </h2>
          <div className="flex items-center gap-2 transition-all duration-100 ease-linear">
            <div className="flex mb-[-6px] font-semibold md:mb-[0px] bg-white shadow-sm dark:bg-[#1D2833] rounded-full p-1">
              <button
                onClick={() => setSortBy("stake")}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  sortBy === "stake"
                    ? "bg-[#EFF2F5] dark:bg-[#2d3d4d] text-[#030303] dark:text-white shadow-sm"
                    : "text-[#6D7C8D] dark:text-gray-400 hover:text-[#030303] dark:hover:text-gray-200"
                }`}
              >
                Stake
              </button>
              <button
                onClick={() => setSortBy("vote")}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  sortBy === "vote"
                    ? "bg-[#EFF2F5] dark:bg-[#2d3d4d] text-[#030303] dark:text-white shadow-sm"
                    : "text-[#6D7C8D] dark:text-gray-400 hover:text-[#030303] dark:hover:text-gray-200"
                }`}
              >
                Vote
              </button>
            </div>
          </div>
        </div>

        <div className="relative">
          <Swiper
            modules={[Navigation, FreeMode]}
            spaceBetween={16}
            freeMode={true}
            navigation={{
              prevEl: ".swiper-prev-btn-proposals",
              nextEl: ".swiper-next-btn-proposals",
            }}
            breakpoints={{
              0: {
                slidesPerView: 1,
              },
              375: {
                slidesPerView: 2,
              },
              768: {
                slidesPerView: 3,
              },
              1024: {
                slidesPerView: 4,
              },
            }}
          >
            {sortedProposals.map((proposal) => (
              <SwiperSlide key={proposal.id} className="">
                {sortBy === "stake" ? (
                  <div className="bg-white border border-[#efefef] dark:border-[#28303e] flex flex-col justify-between min-h-[280px] w-full dark:bg-[#1D2833] rounded-lg shadow-sm p-5">
                    <h3 className="text-xl font-semibold text-[#030303] dark:text-white mb-4 sm:line-clamp-none line-clamp-3">
                      {proposal.title}
                    </h3>
                    <div className="flex flex-col gap-2 font-medium text-xs">
                      <button
                        onClick={() => handleStakeClick(proposal, "For")}
                        className="flex-1 py-3 px-4 bg-transparent border border-[#10b981] uppercase text-[#10b981e0] rounded-full hover:bg-[#10b981e0] hover:text-white transition-all duration-200 transform hover:scale-105 active:scale-95"
                      >
                        <ThumbsUp className="inline-block w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleStakeClick(proposal, "Against")}
                        className="flex-1 py-3 px-4 bg-transparent border border-[#f54a4a] uppercase text-[#f54a4a] rounded-full hover:bg-[#f54a4a] hover:text-white transition-all duration-200 transform hover:scale-105 active:scale-95"
                      >
                        <ThumbsDown className="inline-block w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-[#efefef] dark:border-[#28303e] flex flex-col justify-between min-h-[280px] w-full dark:bg-[#1D2833] rounded-lg shadow-sm p-5">
                    <h3 className="text-xl font-semibold text-[#030303] dark:text-white mb-4 sm:line-clamp-none line-clamp-3">
                      {proposal.title}
                    </h3>
                    <div className="flex flex-col gap-2 font-medium text-xs">
                      <button
                        onClick={() => { handleVoteClick(proposal); setSelectedVote("For"); }}
                        className="flex-1 py-3 px-4 bg-transparent border border-[#10b981] uppercase text-[#10b981e0] rounded-full hover:bg-[#10b981e0] hover:text-white transition-all duration-200 transform hover:scale-105 active:scale-95"
                      >
                        <ThumbsUp className="inline-block w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { handleVoteClick(proposal); setSelectedVote("Against"); }}
                        className="flex-1 py-3 px-4 bg-transparent border border-[#f54a4a] uppercase text-[#f54a4a] rounded-full hover:bg-[#f54a4a] hover:text-white transition-all duration-200 transform hover:scale-105 active:scale-95"
                      >
                        <ThumbsDown className="inline-block w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        <div className="flex justify-center items-center gap-2 mt-8">
          <button className="swiper-prev-btn-proposals p-2 border border-[#dde0e0] dark:border-[#232F3B] rounded-full hover:bg-white dark:hover:bg-[#1D2833] transition-colors">
            <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          </button>
          <button className="p-2 border border-[#dde0e0] dark:border-[#232F3B] rounded-full hover:bg-white dark:hover:bg-[#1D2833] transition-colors">
            <ArrowRight className="swiper-next-btn-proposals w-6 h-6 text-gray-700 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {isModalOpen && selectedProposal && (
        <Modal handleClose={() => setIsModalOpen(false)} open={isModalOpen}>
          <div className="">
            <h2 className="text-xl font-semibold mb-4 dark:text-white" style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              Stake COMP {selectedOutcome} {selectedProposal?.title}
            </h2>

            {/* Delegate Selection */}
            <div className="mb-2">
              <div className="relative delegate-dropdown">
                <button
                  onClick={() => setIsDelegateDropdownOpen(!isDelegateDropdownOpen)}
                  className="w-full flex items-center justify-between py-2 px-3 bg-[#EFF2F5] dark:bg-[#1D2833] border border-[#efefef] dark:border-[#28303e] rounded-md hover:bg-[#E5E7EB] dark:hover:bg-[#24313d] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {selectedDelegate ? (
                      <>
                        <Image
                          src={selectedDelegate.image}
                          alt={selectedDelegate.name}
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                        <span className="font-semibold text-[#030303] dark:text-white">
                          {selectedDelegate.name}
                        </span>
                      </>
                    ) : (
                      <span className="text-[#6D7C8D] font-semibold text-sm">Select delegate</span>
                    )}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-[#6D7C8D] transition-transform ${isDelegateDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {isDelegateDropdownOpen && (
                    <motion.div
                      key="delegate-dropdown"
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      variants={delegateDropdownVariants}
                      className={`absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#1D2833] border border-[#efefef] dark:border-[#28303e] rounded-lg shadow-lg z-10 max-h-48 min-h-[120px] overflow-y-auto ${isDelegateDropdownOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
                      style={{ willChange: 'transform, opacity' }}
                    >
                      {userDelegations.length > 0 ? (
                        userDelegations.map((delegate) => (
                          <button
                            key={delegate.id}
                            onClick={() => {
                              setSelectedDelegate(delegate);
                              setIsDelegateDropdownOpen(false);
                              toast.success(`Selected delegate: ${delegate.name}`, {
                                style: {
                                  fontWeight: "600",
                                },
                              });
                            }}
                            className={`w-full flex items-center gap-3 p-3 hover:bg-[#F9FAFB] dark:hover:bg-[#24313d] transition-colors ${
                              selectedDelegate?.id === delegate.id ? 'bg-[#EFF2F5] dark:bg-[#2d3d4d]' : ''
                            }`}
                          >
                            <Image
                              src={delegate.image}
                              alt={delegate.name}
                              width={24}
                              height={24}
                              className="rounded-full"
                            />
                            <div className="flex-1 text-left">
                              <div className="font-semibold text-[#030303] dark:text-white">
                                {delegate.name}
                              </div>
                            </div>
                            {selectedDelegate?.id === delegate.id && (
                              <div className="w-2 h-2 bg-[#10b981] rounded-full"></div>
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full py-8 px-4">
                          <div className="w-8 h-8 bg-[#EFF2F5] dark:bg-[#2d3d4d] rounded-full flex items-center justify-center mb-3">
                            <Users className="w-4 h-4 text-[#6D7C8D]" />
                          </div>
                          <p className="text-sm font-semibold text-[#6D7C8D] text-center mb-1">
                            No delegations yet
                          </p>
                          <p className="text-xs text-[#6D7C8D] text-center">
                            Delegate COMP to start staking
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Stake Amount Input */}
            <div className="relative mb-4">
              <div className="flex flex-col space-y-2">
                <div className="flex flex-col border bg-[#EFF2F5] dark:bg-[#1D2833] border-[#efefef] dark:border-[#28303e] rounded-lg h-20 p-3">
                  <div className="flex items-center justify-between mt-[-6px]">
                    <input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-transparent font-semibold dark:text-gray-100 focus:outline-none text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <div className="flex items-center mr-3 ml-2">
                      <button 
                        onClick={() => {
                          setAmount(formattedCompBalance.toString());
                          if (formattedCompBalance > 0) {
                            toast.success(`Set to maximum: ${formattedCompBalance.toFixed(4)} COMP`, {
                              style: {
                                fontWeight: "600",
                              },
                            });
                          }
                        }}
                        className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#E5E7EB] dark:bg-[#2d3d4d] text-[#374151] dark:text-white hover:bg-[#D1D5DB] dark:hover:bg-[#3d4d5d] transition-colors mr-2"
                      >
                        MAX
                      </button>
                      <Image
                        src="/logo.png"
                        alt="Compensator Logo"
                        width={20}
                        height={20}
                        className="mx-auto rounded-full"
                      />
                      <span className="px-1 font-semibold py-2 dark:text-gray-200 rounded text-sm">
                        COMP
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-2 font-medium">
                    <p className="text-xs text-[#6D7C8D]">
                      {amount
                        ? `$${(parseFloat(amount) * compPrice).toFixed(2)}`
                        : "$0.00"}
                    </p>
                    <p className="text-xs text-[#6D7C8D] flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                        <path d="M2.273 5.625A4.483 4.483 0 015.25 4.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0018.75 3H5.25a3 3 0 00-2.977 2.625zM2.273 8.625A4.483 4.483 0 015.25 7.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0018.75 6H5.25a3 3 0 00-2.977 2.625zM5.25 9a3 3 0 00-3 3v6a3 3 0 003 3h13.5a3 3 0 003-3v-6a3 3 0 00-3-3H15a.75.75 0 01-.75-.75 1.5 1.5 0 00-1.5-1.5H9a1.5 1.5 0 00-1.5 1.5A.75.75 0 016 9H5.25z" />
                      </svg>
                      {formattedCompBalance.toFixed(4)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Percentage Buttons */}
            <div
              className={`grid ${
                hasSelectedPercentage ? "grid-cols-5" : "grid-cols-4"
              } gap-2 mb-6`}
            >
              {hasSelectedPercentage && (
                <button
                  onClick={() => {
                    setAmount("");
                    setHasSelectedPercentage(false);
                    toast.success("Amount reset", {
                      style: {
                        fontWeight: "600",
                      },
                    });
                  }}
                  className="py-[4px] border font-medium border-[#efefef] dark:border-[#2e3746] rounded-full text-sm hover:bg-[#EFF2F5] dark:hover:bg-gray-800 dark:text-gray-200 transition-colors"
                >
                  Reset
                </button>
              )}
              {[25, 50, 75, 100].map((percent) => (
                <button
                  key={percent}
                  onClick={() => {
                    const selectedAmount =
                      (percent / 100) * formattedCompBalance;
                    setAmount(selectedAmount.toFixed(4).toString());
                    setHasSelectedPercentage(true);
                    if (selectedAmount > 0) {
                      toast.success(`Set to ${percent}%: ${selectedAmount.toFixed(4)} COMP`, {
                        style: {
                          fontWeight: "600",
                        },
                      });
                    }
                  }}
                  className="py-[4px] border font-medium border-[#efefef] dark:border-[#2e3746] rounded-full text-sm hover:bg-[#EFF2F5] dark:hover:bg-gray-800 dark:text-gray-200 transition-colors"
                >
                  {percent}%
                </button>
              ))}
            </div>

            {/* Enhanced Visual Stake Bar */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-[#6D7C8D]">Total Stakes</span>
                <span className="text-sm font-semibold text-[#030303] dark:text-white">
                  {totalStakes.toLocaleString()} COMP
                </span>
              </div>
              
              {/* Main Battle Bar Container */}
              <div className={`relative h-3 bg-[#EFF2F5] dark:bg-[#2d3d4d] rounded-full overflow-hidden shadow-inner border border-[#e5e7eb] dark:border-[#374151] ${totalStakes > 0 ? 'battle-pulse' : ''}`}>
                {/* For stakes (green) - Left side pushing right */}
                <div 
                  className={`absolute left-0 top-0 h-full bg-gradient-to-r from-[#10b981] via-[#059669] to-[#047857] transition-all duration-700 ease-out shadow-lg ${totalStakes > 0 ? 'force-push-right' : ''}`}
                  style={{ 
                    width: `${forPercentage}%`,
                    boxShadow: totalStakes > 0 ? 'inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 4px rgba(16, 185, 129, 0.3)' : 'none'
                  }}
                >
                  {/* Animated shine effect */}
                  {totalStakes > 0 && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent energy-flow"></div>
                  )}
                  
                  {/* Force lines indicating push */}
                  {totalStakes > 0 && (
                    <>
                      <div className="absolute right-0 top-0 w-2 h-full bg-gradient-to-l from-[#10b981]/50 to-transparent"></div>
                      <div className="absolute right-1 top-1/2 w-1 h-2 bg-white/30 rounded-full transform -translate-y-1/2 animate-ping"></div>
                      
                      {/* Energy particles */}
                      <div className="absolute right-2 top-1/4 w-0.5 h-0.5 bg-white/60 rounded-full animate-ping"></div>
                      <div className="absolute right-3 top-3/4 w-0.5 h-0.5 bg-white/40 rounded-full animate-ping" style={{animationDelay: '0.3s'}}></div>
                    </>
                  )}
                </div>
                
                {/* Against stakes (red) - Right side pushing left */}
                <div 
                  className={`absolute right-0 top-0 h-full bg-gradient-to-l from-[#f54a4a] via-[#dc2626] to-[#b91c1c] transition-all duration-700 ease-out shadow-lg ${totalStakes > 0 ? 'force-push-left' : ''}`}
                  style={{ 
                    width: `${againstPercentage}%`,
                    boxShadow: totalStakes > 0 ? 'inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 4px rgba(245, 74, 74, 0.3)' : 'none'
                  }}
                >
                  {/* Animated shine effect */}
                  {totalStakes > 0 && (
                    <div className="absolute inset-0 bg-gradient-to-l from-transparent via-white/20 to-transparent energy-flow"></div>
                  )}
                  
                  {/* Force lines indicating push */}
                  {totalStakes > 0 && (
                    <>
                      <div className="absolute left-0 top-0 w-2 h-full bg-gradient-to-r from-[#f54a4a]/50 to-transparent"></div>
                      <div className="absolute left-1 top-1/2 w-1 h-2 bg-white/30 rounded-full transform -translate-y-1/2 animate-ping"></div>
                      
                      {/* Energy particles */}
                      <div className="absolute left-2 top-1/4 w-0.5 h-0.5 bg-white/60 rounded-full animate-ping"></div>
                      <div className="absolute left-3 top-3/4 w-0.5 h-0.5 bg-white/40 rounded-full animate-ping" style={{animationDelay: '0.3s'}}></div>
                    </>
                  )}
                </div>
                
                {/* Battle center line with glow effect - only show when there are stakes */}
                {totalStakes > 0 && (
                  <div className="absolute left-1/2 top-0 w-0.5 h-full bg-gradient-to-b from-transparent via-[#6D7C8D] to-transparent transform -translate-x-1/2 shadow-[0_0_8px_rgba(109,124,141,0.5)]"></div>
                )}
                
                {/* Impact zone at center - only show when there are stakes */}
                {totalStakes > 0 && (
                  <div className="absolute left-1/2 top-1/2 w-1 h-1 bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2 impact-shock"></div>
                )}
                
                {/* Battle particles - only show when there are stakes */}
                {totalStakes > 0 && (
                  <>
                    <div className="absolute left-1/4 top-1/2 w-0.5 h-0.5 bg-white/40 rounded-full transform -translate-y-1/2 animate-bounce"></div>
                    <div className="absolute right-1/4 top-1/2 w-0.5 h-0.5 bg-white/40 rounded-full transform -translate-y-1/2 animate-bounce" style={{animationDelay: '0.5s'}}></div>
                    
                    {/* Shock waves */}
                    <div className="absolute left-1/2 top-1/2 w-0.5 h-0.5 bg-white/30 rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-ping" style={{animationDelay: '0.2s'}}></div>
                    <div className="absolute left-1/2 top-1/2 w-0.5 h-0.5 bg-white/20 rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-ping" style={{animationDelay: '0.4s'}}></div>
                  </>
                )}
              </div>
              
              {/* Enhanced labels with icons */}
              <div className="flex justify-between items-center mt-3">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="w-3 h-3 bg-[#10b981] rounded-full shadow-lg"></div>
                    <div className="absolute inset-0 w-3 h-3 bg-[#10b981] rounded-full animate-ping opacity-75"></div>
                  </div>
                  <span className="text-xs font-semibold text-[#10b981] flex items-center gap-1">
                    For: {stakedFor.toFixed(0)} COMP ({forPercentage.toFixed(0)}%)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#f54a4a] flex items-center gap-1">
                    Against: {stakedAgainst.toFixed(0)} COMP ({againstPercentage.toFixed(0)}%)
                  </span>
                  <div className="relative">
                    <div className="w-3 h-3 bg-[#f54a4a] rounded-full shadow-lg"></div>
                    <div className="absolute inset-0 w-3 h-3 bg-[#f54a4a] rounded-full animate-ping opacity-75"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={() => {
                if (!selectedDelegate) {
                  toast.error("Please select a delegate", {
                    style: {
                      fontWeight: "600",
                    },
                  });
                  return;
                }
                if (!amount || parseFloat(amount) <= 0) {
                  toast.error("Please enter a stake amount", {
                    style: {
                      fontWeight: "600",
                    },
                  });
                  return;
                }
                if (parseFloat(amount) > formattedCompBalance) {
                  toast.error("Insufficient COMP balance", {
                    style: {
                      fontWeight: "600",
                    },
                  });
                  return;
                }
                handleSubmitStake(parseFloat(amount));
              }}
              disabled={
                !amount ||
                parseFloat(amount) <= 0 ||
                parseFloat(amount) > formattedCompBalance ||
                loading ||
                !selectedDelegate
              }
              className={`${
                loading ||
                !amount ||
                parseFloat(amount) <= 0 ||
                parseFloat(amount) > formattedCompBalance ||
                !selectedDelegate
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-emerald-600"
              } transition-all duration-200 font-semibold transform hover:scale-105 active:scale-95 w-full text-sm bg-[#10b981e0] text-white py-3 text-center rounded-full flex justify-center items-center ${
                parseFloat(amount) > formattedCompBalance
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
              ) : parseFloat(amount) > formattedCompBalance ? (
                "Insufficient Balance"
              ) : !selectedDelegate ? (
                "Select a Delegate"
              ) : (
                `Submit Stake ${selectedOutcome}`
              )}
            </button>
          </div>
        </Modal>
      )}
      {isVoteModalOpen && selectedVoteProposal && (
        <Modal handleClose={() => setIsVoteModalOpen(false)} open={isVoteModalOpen}>
          <div className="">
            <h2 className="text-xl font-semibold mb-4 dark:text-white" style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              Vote on {selectedVoteProposal?.title}
            </h2>
            
            {/* Selected Vote Display */}
            <div className="mb-6 flex items-center justify-center">
              {selectedVote === "For" ? (
                <div className="flex-1 py-3 px-4 bg-[#10b981e0] border border-[#10b981] uppercase text-white rounded-full flex justify-center items-center relative">
                  <ThumbsUp className="w-4 h-4" />
                  <span className="absolute right-4 text-white text-xs uppercase font-bold">Selected</span>
                </div>
              ) : (
                <div className="flex-1 py-3 px-4 bg-[#f54a4a] border border-[#f54a4a] uppercase text-white rounded-full flex justify-center items-center relative">
                  <ThumbsDown className="w-4 h-4" />
                  <span className="absolute right-4 text-white text-xs uppercase font-bold">Selected</span>
                </div>
              )}
            </div>
            
            {/* Vote Amount Input - Matching Stake Modal */}
            <div className="relative mb-4">
              <div className="flex flex-col space-y-2">
                <div className="flex flex-col border bg-[#EFF2F5] dark:bg-[#1D2833] border-[#efefef] dark:border-[#28303e] rounded-lg h-20 p-3">
                  <div className="flex items-center justify-between mt-[-6px]">
                    <input
                      type="number"
                      placeholder="0.00"
                      value={voteAmount}
                      onChange={(e) => setVoteAmount(parseFloat(e.target.value) || 0)}
                      className="w-full bg-transparent font-semibold dark:text-gray-100 focus:outline-none text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <div className="flex items-center mr-3 ml-2">
                      <button 
                        onClick={() => {
                          const maxAmount = userCompensatorAddress ? formattedContractVotingPower : 0;
                          setVoteAmount(maxAmount);
                          if (maxAmount > 0) {
                            toast.success(`Set to maximum: ${maxAmount.toFixed(4)} COMP`, {
                              style: {
                                fontWeight: "600",
                              },
                            });
                          }
                        }}
                        className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#E5E7EB] dark:bg-[#2d3d4d] text-[#374151] dark:text-white hover:bg-[#D1D5DB] dark:hover:bg-[#3d4d5d] transition-colors mr-2"
                      >
                        MAX
                      </button>
                      <Image
                        src="/logo.png"
                        alt="Compensator Logo"
                        width={20}
                        height={20}
                        className="mx-auto rounded-full"
                      />
                      <span className="px-1 font-semibold py-2 dark:text-gray-200 rounded text-sm">
                        COMP
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-2 font-medium">
                    <p className="text-xs text-[#6D7C8D]">
                      {voteAmount
                        ? `$${(voteAmount * compPrice).toFixed(2)}`
                        : "$0.00"}
                    </p>
                    <p className="text-xs text-[#6D7C8D] flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                        <path d="M2.273 5.625A4.483 4.483 0 015.25 4.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0018.75 3H5.25a3 3 0 00-2.977 2.625zM2.273 8.625A4.483 4.483 0 015.25 7.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0018.75 6H5.25a3 3 0 00-2.977 2.625zM5.25 9a3 3 0 00-3 3v6a3 3 0 003 3h13.5a3 3 0 003-3v-6a3 3 0 00-3-3H15a.75.75 0 01-.75-.75 1.5 1.5 0 00-1.5-1.5H9a1.5 1.5 0 00-1.5 1.5A.75.75 0 016 9H5.25z" />
                      </svg>
                      {userCompensatorAddress ? formattedContractVotingPower.toFixed(4) : "0.0000"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Percentage Buttons */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[25, 50, 75, 100].map((percent) => (
                <button
                  key={percent}
                  onClick={() => {
                    const selectedAmount = (percent / 100) * (userCompensatorAddress ? formattedContractVotingPower : 0);
                    setVoteAmount(selectedAmount);
                    if (selectedAmount > 0) {
                      toast.success(`Set to ${percent}%: ${selectedAmount.toFixed(4)} COMP`, {
                        style: {
                          fontWeight: "600",
                        },
                      });
                    }
                  }}
                  className="py-[4px] border font-medium border-[#efefef] dark:border-[#2e3746] rounded-full text-sm hover:bg-[#EFF2F5] dark:hover:bg-gray-800 dark:text-gray-200 transition-colors"
                >
                  {percent}%
                </button>
              ))}
            </div>
            
            <button
              onClick={() => {
                if (!selectedVote) {
                  toast.error("Please select a vote direction (For/Against)", {
                    style: {
                      fontWeight: "600",
                    },
                  });
                  return;
                }
                if (voteAmount <= 0) {
                  toast.error("Please enter a vote amount", {
                    style: {
                      fontWeight: "600",
                    },
                  });
                  return;
                }
                handleSubmitVote();
              }}
              disabled={!selectedVote || voteAmount <= 0}
              className={`w-full py-3 rounded-full font-semibold transition-colors ${selectedVote && voteAmount > 0 ? "bg-[#10b981] text-white hover:bg-emerald-600" : "bg-gray-300 text-gray-500 cursor-not-allowed"}`}
            >
              Submit Vote
            </button>

            {/* Available Rewards Display */}
             <div className="mt-2 px-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#6D7C8D]">Available Rewards</span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-semibold text-[#030303] dark:text-white">
                    {userCompensatorAddress ? (
                      `${parseFloat(availableRewards).toLocaleString()} COMP`
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="text-[#6D7C8D]">Loading..</span>
                      </div>
                    )}
                  </span>
                </div>
              </div>
              {userCompensatorAddress && (
                <div className="mt-2 text-xs text-[#6D7C8D]">
                  COMP available for distribution to stakers from successful votes
                </div>
              )}
              {userCompensatorAddress && parseFloat(availableRewards) > 0 && (
                <div className="mt-2 p-2 bg-[#f59e0b] bg-opacity-10 border border-[#f59e0b] border-opacity-20 rounded text-xs text-[#f59e0b] font-medium">
                  💰 You have rewards to distribute! Stakers will earn from your successful votes.
                </div>
              )}
            </div>
            
            {/* Delegate Voting Power Display */}
            <div className="p-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#6D7C8D]">Voting Power</span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-semibold text-[#030303] dark:text-white">
                    {userCompensatorAddress ? (
                      `${formattedContractVotingPower.toLocaleString()} COMP`
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="text-[#6D7C8D]">Loading..</span>
                      </div>
                    )}
                  </span>
                </div>
              </div>
              {userCompensatorAddress && (
                <div className="mt-2 text-xs text-[#6D7C8D]">
                  Total COMP delegated to your contract for voting
                </div>
              )}
              {userCompensatorAddress && formattedContractVotingPower > 0 && (
                <div className="mt-2 p-2 bg-[#10b981] bg-opacity-10 border border-[#10b981] border-opacity-20 rounded text-xs text-[#10b981] font-medium">
                  🎯 You have significant voting power! Your vote will have a real impact on this proposal.
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};

export default Proposals;
