"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay, FreeMode } from "swiper/modules";
import "swiper/css";
import "swiper/css/free-mode";
import { useState, useRef } from "react";
import Modal from "@/components/common/Modal";

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
          <div
            ref={sliderRef}
            className="relative z-[1]"
          >
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
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              Stake COMP for Proposal {selectedProposal} ({selectedOutcome})
            </h2>
            <input
              type="number"
              placeholder="Enter COMP amount"
              className="w-full p-2 border border-gray-300 rounded-lg mb-4"
            />
            <button
              onClick={() => handleSubmitStake(100)}
              className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Submit Stake
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Proposals;