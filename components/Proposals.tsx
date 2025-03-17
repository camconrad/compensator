"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, FreeMode } from "swiper/modules";
import "swiper/css";
import "swiper/css/free-mode";
import { useState, useRef } from "react";
import Modal from "@/components/common/Modal";
import Image from "next/image";
import { ArrowLeft, ArrowRight, ThumbsUp, ThumbsDown } from "lucide-react";

const proposals = [
  {
    id: 1,
    title: "Add weETH as collateral into cUSDTv3 on Mainnet",
    status: "Active",
    createdAt: "2023-10-01",
    popularity: 120,
  },
  {
    id: 2,
    title: "Increase COMP rewards for cDAI holders",
    status: "Pending",
    createdAt: "2023-10-05",
    popularity: 80,
  },
  {
    id: 3,
    title: "Reduce liquidation penalty to 5%",
    status: "Active",
    createdAt: "2023-09-28",
    popularity: 150,
  },
  {
    id: 4,
    title: "Enable AAVE as collateral in Compound V3",
    status: "Defeated",
    createdAt: "2023-09-20",
    popularity: 60,
  },
  {
    id: 5,
    title: "Proposal to integrate Chainlink Price Feeds",
    status: "Active",
    createdAt: "2023-10-10",
    popularity: 200,
  },
];

const Proposals = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<number | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<"For" | "Against" | null>(null);
  const [sortBy, setSortBy] = useState<"latest" | "popularity">("latest");
  const [loading, setLoading] = useState(false);
  const navigationPrevRef = useRef(null);
  const navigationNextRef = useRef(null);

  const [amount, setAmount] = useState("");
  const [hasSelectedPercentage, setHasSelectedPercentage] = useState(false);

  const userBalance = 0.00;
  const compPrice = 41.44;

  const sortedProposals = [...proposals].sort((a, b) => {
    if (sortBy === "latest") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortBy === "popularity") {
      return b.popularity - a.popularity;
    }
    return 0;
  });

  const handleStakeClick = (proposalId: number, outcome: "For" | "Against") => {
    setSelectedProposal(proposalId);
    setSelectedOutcome(outcome);
    setIsModalOpen(true);
  };

  const handleSubmitStake = (amount: number) => {
    setLoading(true);
    setTimeout(() => {
      console.log(`Staking ${amount} COMP for proposal ${selectedProposal} (${selectedOutcome})`);
      setIsModalOpen(false);
      setLoading(false);
    }, 2000);
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
                onClick={() => setSortBy("latest")}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  sortBy === "latest"
                    ? "bg-[#EFF2F5] dark:bg-[#2d3d4d] text-[#030303] dark:text-white shadow-sm"
                    : "text-[#959595] dark:text-gray-400 hover:text-[#030303] dark:hover:text-gray-200"
                }`}
              >
                Latest
              </button>
              <button
                onClick={() => setSortBy("popularity")}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  sortBy === "popularity"
                    ? "bg-[#EFF2F5] dark:bg-[#2d3d4d] text-[#030303] dark:text-white shadow-sm"
                    : "text-[#959595] dark:text-gray-400 hover:text-[#030303] dark:hover:text-gray-200"
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
              prevEl: '.swiper-prev-btn-proposals',
              nextEl: '.swiper-next-btn-proposals',
            }}
            breakpoints={{
              0: {
                slidesPerView: 1,
              },
              375: {
                slidesPerView: 2,
              },
              768: {
                slidesPerView: 3
              },
              1024: {
                slidesPerView: 4,
              },
            }}
            onInit={(swiper) => {
              // if (typeof swiper.params.navigation === "object" && swiper.params.navigation) {
              //   swiper.params.navigation.prevEl = navigationPrevRef.current;
              //   swiper.params.navigation.nextEl = navigationNextRef.current;
              //   swiper.navigation.init();
              //   swiper.navigation.update();
              // }
            }}
          >
            {sortedProposals.map((proposal) => (
              <SwiperSlide key={proposal.id} className="">
                <div className="bg-white border border-[#efefef] dark:border-[#28303e] flex flex-col justify-between min-h-[280px] w-full dark:bg-[#1D2833] rounded-lg shadow-sm p-5">
                  <h3 className="text-xl font-semibold text-[#030303] dark:text-white mb-4">
                    {proposal.title}
                  </h3>
                  <div className="flex flex-col gap-2 font-[family-name:var(--font-geist-sans)] font-medium text-xs">
                    <button
                      onClick={() => handleStakeClick(proposal.id, "For")}
                      className="flex-1 py-3 px-4 bg-transparent border border-[#10b981] uppercase text-[#10b981] rounded-full hover:bg-[#10b981] hover:text-white transition-all duration-200 transform hover:scale-105 active:scale-95"
                    >
                      <ThumbsUp className="inline-block w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleStakeClick(proposal.id, "Against")}
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
          <button
            className="swiper-prev-btn-proposals p-2 border border-[#dde0e0] dark:border-[#232F3B] rounded-full hover:bg-white dark:hover:bg-[#1D2833] transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          </button>
          <button
            className="p-2 border border-[#dde0e0] dark:border-[#232F3B] rounded-full hover:bg-white dark:hover:bg-[#1D2833] transition-colors"
          >
            <ArrowRight className="swiper-next-btn-proposals w-6 h-6 text-gray-700 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {isModalOpen && (
        <Modal handleClose={() => setIsModalOpen(false)} open={isModalOpen}>
          <div className="p-2">
            <h2 className="text-xl font-semibold mb-4 dark:text-white">
              Stake COMP for Proposal {selectedProposal} ({selectedOutcome})
            </h2>
            <div className="relative mb-4">
              <div className="flex flex-col space-y-2">
                <div className="flex flex-col border bg-white dark:bg-[#1D2833] border-[#efefef] dark:border-[#2e3746] rounded-lg h-20 p-3">
                  <div className="flex items-center justify-between mt-[-6px]">
                    <input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-transparent dark:text-gray-100 focus:outline-none text-lg"
                    />
                    <div className="flex items-center mr-3 ml-2">
                      <Image
                        src="/logo.png"
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
                    <p className="text-xs text-[#959595]">
                      {amount
                        ? `$${(parseFloat(amount) * compPrice).toFixed(2)}`
                        : "$0.00"}
                    </p>
                    <p className="text-xs text-[#959595]">
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
                  className="py-[4px] border border-[#efefef] dark:border-[#2e3746] rounded-full text-sm hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-200 transition-colors"
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
                  className="py-[4px] border border-[#efefef] dark:border-[#2e3746] rounded-full text-sm hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-200 transition-colors"
                >
                  {percent}%
                </button>
              ))}
            </div>
            <button
              onClick={() => handleSubmitStake(parseFloat(amount))}
              disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > userBalance || loading}
              className={`${
                loading || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > userBalance
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-emerald-600"
              } transition-all duration-200 font-semibold transform hover:scale-105 active:scale-95 w-full text-sm bg-[#10b981] text-white py-3 text-center rounded-full flex justify-center items-center ${
                parseFloat(amount) > userBalance ? "bg-red-500 hover:bg-red-600" : ""
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
              ) : parseFloat(amount) > userBalance ? (
                "Insufficient Balance"
              ) : (
                "Submit Stake"
              )}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Proposals
