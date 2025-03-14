"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay, FreeMode } from "swiper/modules";
import "swiper/css";
import "swiper/css/free-mode";
import { useState, useRef } from "react";
import Modal from "@/components/common/Modal";
import Image from "next/image";

// Mock data
const proposals = [
  {
    id: 1,
    title: "Add weETH as collateral into cUSDTv3 on Mainnet",
    status: "Active",
  },
  {
    id: 2,
    title: "Increase COMP rewards for cDAI holders",
    status: "Pending",
  },
  {
    id: 3,
    title: "Reduce liquidation penalty to 5%",
    status: "Active",
  },
  {
    id: 4,
    title: "Enable AAVE as collateral in Compound V3",
    status: "Defeated",
  },
  {
    id: 5,
    title: "Proposal to integrate Chainlink Price Feeds",
    status: "Active",
  },
];

const Proposals = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [selectedOutcome, setSelectedOutcome] = useState<"For" | "Against" | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState("light");

  // State variables for the stake form
  const [amount, setAmount] = useState("");
  const [isUsd, setIsUsd] = useState(false);
  const [hasSelectedPercentage, setHasSelectedPercentage] = useState(false);

  // Mock data - in a real app, these would come from your API or data store
  const userBalance = 0.0; // User's available COMP balance
  const compPrice = 45.78; // Current COMP price in USD

  const handleStakeClick = (proposalId: number, outcome: "For" | "Against") => {
    setSelectedProposal(proposalId as any);
    setSelectedOutcome(outcome);
    setIsModalOpen(true);
  };

  const handleSubmitStake = (amount: number) => {
    console.log(`Staking ${amount} COMP for proposal ${selectedProposal} (${selectedOutcome})`);
    setIsModalOpen(false);
  };

  return (
    <div className="w-full mt-8 max-w-[1100px] mx-auto">
      <div className="container mx-auto px-4">
        <h2 className="text-[24px] tracking-tight sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Proposals
        </h2>

        <div className="relative overflow-hidden">
          <div ref={sliderRef} className="relative z-[1]">
            <Swiper
              modules={[Navigation, FreeMode, Autoplay]}
              spaceBetween={16}
              slidesPerView="auto"
              freeMode={true}
              navigation
              autoplay={{ delay: 5000, disableOnInteraction: true }}
              className="!overflow-visible"
            >
              {proposals.map((proposal) => (
                <SwiperSlide key={proposal.id} className="!w-auto max-w-[280px]">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                      {proposal.title}
                    </h3>
                    <div className="flex gap-3 font-[family-name:var(--font-geist-sans)] font-medium text-sm">
                      <button
                        onClick={() => handleStakeClick(proposal.id, "For")}
                        className="flex-1 py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                      >
                        For
                      </button>
                      <button
                        onClick={() => handleStakeClick(proposal.id, "Against")}
                        className="flex-1 py-2 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      >
                        Against
                      </button>
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
      </div>
      {isModalOpen && (
        <Modal handleClose={() => setIsModalOpen(false)} open={isModalOpen}>
          <div className="p-6 font-[family-name:var(--font-geist-sans)]">
            <h2 className="mt-7 text-xl font-semibold mb-4 dark:text-white">
              Stake COMP for Proposal {selectedProposal} ({selectedOutcome})
            </h2>
            <div className="relative mb-4">
              <div className="flex flex-col space-y-2">
                <div className="flex flex-col border bg-white dark:bg-gray-800 border-gray-300 dark:border-[#2e3746] rounded-lg h-20 p-3">
                  <div className="flex items-center justify-between mt-[-6px]">
                    <input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-transparent dark:text-gray-100 focus:outline-none text-lg"
                    />
                    <div className="flex items-center mr-3">
                      <Image
                        src={theme === "dark" ? "/logo.png" : "/logo-white.png"}
                        alt="Compensator Logo"
                        width={20}
                        height={20}
                        className="mx-auto rounded-full"
                      />
                      <span className="px-2 py-2 dark:text-gray-200 rounded text-sm">
                        COMP
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {amount
                        ? `$${(parseFloat(amount) * compPrice).toFixed(2)}`
                        : "$0.00"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Balance: {userBalance.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div
              className={`grid ${hasSelectedPercentage ? "grid-cols-5" : "grid-cols-4"} gap-2 mb-4`}
            >
              {hasSelectedPercentage && (
                <button
                  onClick={() => {
                    setAmount("");
                    setHasSelectedPercentage(false);
                  }}
                  className="py-[4px] border border-gray-200 dark:border-[#2e3746] rounded-full text-sm hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-200 transition-colors"
                >
                  Reset
                </button>
              )}
              {[25, 50, 75, 100].map((percent) => (
                <button
                  key={percent}
                  onClick={() => {
                    const value = (userBalance * (percent / 100)).toFixed(2);
                    setAmount(value.toString());
                    setHasSelectedPercentage(true);
                  }}
                  className="py-[4px] border border-gray-200 dark:border-[#2e3746] rounded-full text-sm hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-200 transition-colors"
                >
                  {percent}%
                </button>
              ))}
            </div>
            <button
              onClick={() => handleSubmitStake(parseFloat(amount))}
              disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > userBalance}
              className={`w-full py-3 bg-emerald-600 font-medium text-white rounded-full transition-all duration-300 
                ${!amount ? "opacity-70" : "hover:bg-emerald-700"} 
                ${parseFloat(amount) > userBalance ? "bg-red-500 hover:bg-red-600" : ""}
                disabled:bg-gray-400 disabled:cursor-not-allowed`}
            >
              {parseFloat(amount) > userBalance ? "Insufficient Balance" : "Submit Stake"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Proposals;
