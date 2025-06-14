"use client";

import Modal from "@/components/common/Modal";
import { compoundTokenContractInfo } from "@/constants";
import { getEthersSigner } from "@/hooks/useEtherProvider";
import { useGetCompoundContract } from "@/hooks/useGetCompContract";
import { useGetCompensatorContract } from "@/hooks/useGetCompensatorContract";
import { useGetCompensatorFactoryContract } from "@/hooks/useGetCompensatorFactoryContract";
import { wagmiConfig } from "@/providers/WagmiRainbowKitProvider";
import { waitForTransactionReceipt } from "@wagmi/core";
import BigNumber from "bignumber.js";
import { ethers, formatUnits } from "ethers";
import { ArrowLeft, ArrowRight, ThumbsDown, ThumbsUp } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import "swiper/css";
import "swiper/css/free-mode";
import { FreeMode, Navigation } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import { useAccount, useReadContract } from "wagmi";

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
  const [sortBy, setSortBy] = useState<"latest" | "popularity">("latest");
  const [loading, setLoading] = useState(false);
  const navigationPrevRef = useRef(null);
  const navigationNextRef = useRef(null);
  const { address } = useAccount();

  const [amount, setAmount] = useState("");
  const [hasSelectedPercentage, setHasSelectedPercentage] = useState(false);

  const [stakedFor, setStakedFor] = useState(0.0);
  const { handleSetCompensatorContract } = useGetCompensatorContract();
  const [stakedAgainst, setStakedAgainst] = useState(0.0);
  const { compoundContract } = useGetCompoundContract();
  const { compensatorFactoryContract } = useGetCompensatorFactoryContract()

  const { data: userBalance, refetch: refetchCompBalance } = useReadContract({
    address: compoundTokenContractInfo.address as `0x${string}`,
    abi: compoundTokenContractInfo.abi,
    functionName: "balanceOf",
    args: address ? [address as `0x${string}`] : undefined,
  });

  const formattedCompBalance = parseFloat(
    formatUnits((userBalance || "0").toString(), 18)
  );

  const compPrice = 41.44;

  const sortedProposals = [...proposals].sort((a, b) => {
    if (sortBy === "latest") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortBy === "popularity") {
      return b.popularity - a.popularity;
    }
    return 0;
  });

  const handleStakeClick = (proposal: typeof proposals[0], outcome: "For" | "Against") => {
    setSelectedProposal({
      displayId: proposal.id,
      proposalId: proposal.proposalId,
      title: proposal.title
    });
    setSelectedOutcome(outcome);
    setIsModalOpen(true);
  };

  const handleSubmitStake = async (amount: number) => {
    if (!selectedProposal) {
      return toast.error("No proposal selected", {
        style: {
          fontWeight: "600",
        },
      });
    }

    setLoading(true);

    console.log(
      `Staking ${amount} COMP for proposal ${selectedProposal.displayId} (ID: ${selectedProposal.proposalId}) (${selectedOutcome})`
    );
    
    if (selectedOutcome === "For") {
      setStakedFor((prev) => prev + amount);
    } else if (selectedOutcome === "Against") {
      setStakedAgainst((prev) => prev + amount);
    }

    try {
      const compensatorAddress = await compensatorFactoryContract.getCompensator(address)
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
        .parseUnits(amount ? amount?.toString() : "0", decimals)
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

      const gas = await compensatorContract.stakeForProposal.estimateGas(
        selectedProposal.proposalId,
        selectedOutcome === "For" ? 1 : 0,
        convertAmount
      );
      const delegatedReceipt = await compensatorContract.stakeForProposal(
        selectedProposal.proposalId,
        selectedOutcome === "For" ? 1 : 0,
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
        setIsModalOpen(false);
        toast.success("Stake Successfully", {
          style: {
            fontWeight: "600",
          },
        });
      }
    } catch (error) {
      console.log("error :>> ", error);
      toast.error("Failed to stake", {
        style: {
          fontWeight: "600",
        },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isModalOpen) {
      setAmount("");
    }
  }, [isModalOpen]);

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
                onClick={() => setSortBy("latest")}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  sortBy === "latest"
                    ? "bg-[#EFF2F5] dark:bg-[#2d3d4d] text-[#030303] dark:text-white shadow-sm"
                    : "text-[#6D7C8D] dark:text-gray-400 hover:text-[#030303] dark:hover:text-gray-200"
                }`}
              >
                Latest
              </button>
              <button
                onClick={() => setSortBy("popularity")}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  sortBy === "popularity"
                    ? "bg-[#EFF2F5] dark:bg-[#2d3d4d] text-[#030303] dark:text-white shadow-sm"
                    : "text-[#6D7C8D] dark:text-gray-400 hover:text-[#030303] dark:hover:text-gray-200"
                }`}
              >
                Popular
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
            <h2 className="text-xl font-semibold mb-4 dark:text-white">
              Stake COMP {selectedOutcome} {selectedProposal?.title}
            </h2>
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
                        onClick={() => setAmount(formattedCompBalance.toString())}
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
            <div
              className={`grid ${
                hasSelectedPercentage ? "grid-cols-5" : "grid-cols-4"
              } gap-2 mb-4`}
            >
              {hasSelectedPercentage && (
                <button
                  onClick={() => {
                    setAmount("");
                    setHasSelectedPercentage(false);
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
                  }}
                  className="py-[4px] border font-medium border-[#efefef] dark:border-[#2e3746] rounded-full text-sm hover:bg-[#EFF2F5] dark:hover:bg-gray-800 dark:text-gray-200 transition-colors"
                >
                  {percent}%
                </button>
              ))}
            </div>
            <button
              onClick={() => handleSubmitStake(parseFloat(amount))}
              disabled={
                !amount ||
                parseFloat(amount) <= 0 ||
                parseFloat(amount) > formattedCompBalance ||
                loading
              }
              className={`${
                loading ||
                !amount ||
                parseFloat(amount) <= 0 ||
                parseFloat(amount) > formattedCompBalance
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
              ) : (
                "Submit Stake"
              )}
            </button>
            <div className="flex justify-between items-center mt-4 text-sm font-medium text-[#6D7C8D]">
              <div className="">Staked Against</div>
              <div className="flex items-center">
                {stakedAgainst.toFixed(2)} COMP
              </div>
            </div>
            <div className="flex justify-between items-center mt-4 text-sm font-medium text-[#6D7C8D]">
              <div className="">Staked For</div>
              <div className="flex items-center">
                {stakedFor.toFixed(2)} COMP
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Proposals;
