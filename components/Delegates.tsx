"use client";

import Modal from "@/components/common/Modal";
import { compoundTokenContractInfo } from "@/constants";
import {
  delegatesData,
  formatNameForDisplay,
  formatNameForURL,
  type Delegate,
} from "@/lib/delegate-data";
import { compensatorService } from "@/services/compensator";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import blockies from "ethereum-blockies-png";
import { formatUnits, isAddress } from "ethers";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import "swiper/css";
import "swiper/css/free-mode";
import "swiper/css/navigation";
import { FreeMode, Navigation } from "swiper/modules";
import { Swiper, SwiperSlide, type SwiperRef } from "swiper/react";
import {
  useAccount,
  useReadContract,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { mainnet } from "wagmi/chains";

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

const Delegates = () => {
  const { openConnectModal } = useConnectModal();
  const { switchChainAsync } = useSwitchChain();
  const [sortBy, setSortBy] = useState("rank");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDelegate, setSelectedDelegate] = useState<Delegate | null>(
    null
  );
  const { address } = useAccount();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const swiperRef = useRef<SwiperRef | null>(null);
  const [listDelegatesFormFactory, setListDelegatesFromServer] = useState<any[]>([]);
  const { writeContractAsync } = useWriteContract();

  const handleGetDelegatesFromServer = async () => {
    try {
      const compensators = await compensatorService.getAllCompensators();
      const delegates = compensators.map((compensator: any, index: number) => {
        const dataURL = blockies.createDataURL({
          seed: compensator?.address || compensator?.owner,
        });
        return {
          name: compensator?.name || `Delegate ${index + 1}`,
          address: compensator?.address,
          votingPower: Number(compensator?.votingPower || 0),
          distributed: compensator?.totalStakes || 0,
          totalDelegations: 0, // Would need to calculate from delegations
          performance7D: 0, // Would need to calculate from performance data
          rewardAPR: "0.00%", // Would need to get from contract
          image: dataURL,
          isServer: true,
          id: delegatesData.length + index + 1,
        };
      });
      setListDelegatesFromServer(delegates);
    } catch (error) {
      console.log("error :>> ", error);
    }
  };

  console.log("listDelegatesFormFactory :>> ", listDelegatesFormFactory);

  useEffect(() => {
    handleGetDelegatesFromServer();
  }, []);

  const { data: compBalance, refetch: refetchCompBalance } = useReadContract({
    address: compoundTokenContractInfo.address as `0x${string}`,
    abi: compoundTokenContractInfo.abi,
    functionName: "balanceOf",
    args: address ? [address as `0x${string}`] : undefined,
  });

  const formattedCompBalance = compBalance
    ? parseFloat(formatUnits((compBalance || "0").toString(), 18)).toFixed(4)
    : "0.0000";

  const sortedDelegates = [...delegatesData, ...listDelegatesFormFactory].sort(
    (a, b) => {
      if (sortBy === "apr") {
        const aprA = Number.parseFloat(a.rewardAPR);
        const aprB = Number.parseFloat(b.rewardAPR);
        return aprB - aprA;
      }
      return a.id - b.id;
    }
  );

  const handleCardClick = (delegate: Delegate) => {
    setSelectedDelegate(delegate);
    setIsModalOpen(true);
  };

  const handleButtonClick = (event: React.MouseEvent, delegate: Delegate) => {
    event.stopPropagation();
    setSelectedDelegate(delegate);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedDelegate(null);
    setAmount("");
  };

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

      if (!selectedDelegate || !amount || Number.parseFloat(amount) <= 0) {
        toast.error("Please enter a valid amount", {
          style: {
            fontWeight: "600",
          },
        });
        throw new Error("Invalid amount or delegate");
      }

      if (!selectedDelegate.address || !isAddress(selectedDelegate.address)) {
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

      const delegateAddress = selectedDelegate.address as `0x${string}`;

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

      toast.success(`Successfully delegated to ${selectedDelegate.name}!`, {
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

  return (
    <div className="w-full max-w-[1100px] mx-auto font-sans">
      <div className="mx-auto px-4">
        <div className="flex flex-row justify-between items-center gap-2 mb-4">
          <h2 className="text-[24px] sm:text-2xl font-bold text-[#030303] dark:text-white mb-[-10px] md:mb-[-12px]">
            Delegates
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex mb-[-6px] font-semibold md:mb-[0px] bg-white dark:bg-[#1D2833] rounded-full p-1 transition-all duration-100 ease-linear">
              <button
                onClick={() => setSortBy("rank")}
                className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                  sortBy === "rank"
                    ? "bg-[#EFF2F5] dark:bg-[#2d3d4d] text-[#030303] dark:text-white shadow-sm"
                    : "text-[#6D7C8D]dark:text-gray-400 hover:text-[#030303] dark:hover:text-gray-200"
                }`}
              >
                Rank
              </button>
              <button
                onClick={() => setSortBy("apr")}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  sortBy === "apr"
                    ? "bg-[#EFF2F5] dark:bg-[#2d3d4d] text-[#030303] dark:text-white shadow-sm"
                    : "text-[#6D7C8D] dark:text-gray-400 hover:text-[#030303] dark:hover:text-gray-200"
                }`}
              >
                APR
              </button>
            </div>
          </div>
        </div>
        <Swiper
          ref={swiperRef}
          modules={[Navigation, FreeMode]}
          spaceBetween={16}
          freeMode={true}
          navigation={{
            prevEl: ".swiper-prev-btn-delegates",
            nextEl: ".swiper-next-btn-delegates",
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
          onInit={(swiper) => {}}
        >
          {sortedDelegates.map((delegate: any, index) => (
            <SwiperSlide key={delegate.id || index} className="">
              <div
                onClick={() => handleCardClick(delegate)}
                className="group bg-white border border-[#efefef] dark:border-[#28303e] flex flex-col justify-between min-h-[206px] w-full dark:bg-[#1D2833] rounded-lg shadow-sm p-5 duration-200 relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="relative h-12 w-12 flex-shrink-0">
                    <Image
                      src={delegate.image || "/placeholder.svg"}
                      alt={delegate.name}
                      fill
                      className="object-cover rounded-full"
                      unoptimized
                    />
                  </div>
                  <div className="truncate">
                    <h3 className="text-lg font-semibold text-[#030303] dark:text-white truncate">
                      {delegate.name}
                    </h3>
                    <p className="text-sm font-medium truncate text-[#6D7C8D]">
                      {truncateAddressMiddle(delegate.address)}
                    </p>
                  </div>
                </div>
                <div className="flex justify-between items-end mt-2 transition-transform duration-200 group-hover:-translate-y-12">
                  <div>
                    <p className="text-xl font-bold text-[#030303] dark:text-white">
                      #
                      {delegate?.isServer || sortBy === "apr"
                        ? delegate.id
                        : delegate.id}
                    </p>
                    <p className="text-sm font-medium text-[#6D7C8D]">Rank</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-[#030303] dark:text-white">
                      {delegate.rewardAPR}
                    </p>
                    <p className="text-sm font-medium text-[#6D7C8D]">
                      Reward APR
                    </p>
                  </div>
                </div>
                <button
                  onClick={(event) => handleButtonClick(event, delegate)}
                  className="absolute transition-all duration-200 transform hover:scale-105 active:scale-95 bottom-3 w-[90%] left-0 right-0 mx-auto text-sm bg-[#10b981e0] text-white py-[10px] text-center font-semibold  rounded-full opacity-0 group-hover:opacity-100 translate-y-full group-hover:translate-y-0"
                >
                  Delegate
                </button>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
        <div className="flex justify-center items-center gap-2 mt-8">
          <button className="swiper-prev-btn-delegates p-2 border border-[#dde0e0] dark:border-[#232F3B] rounded-full hover:bg-white dark:hover:bg-[#1D2833] transition-colors">
            <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          </button>
          <button className="swiper-next-btn-delegates p-2 border border-[#dde0e0] dark:border-[#232F3B] rounded-full hover:bg-white dark:hover:bg-[#1D2833] transition-colors">
            <ArrowRight className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {isModalOpen && selectedDelegate && (
        <Modal handleClose={handleModalClose} open={isModalOpen}>
          <div className="">
            <div className="relative h-14 w-14 flex-shrink-0 mb-4 rounded-full overflow-hidden">
              <Image
                src={selectedDelegate.image || "/placeholder.svg"}
                alt={selectedDelegate.name}
                width={56}
                height={56}
                className="object-cover"
                unoptimized
              />
            </div>
            <h2 className="text-xl font-semibold mb-4 dark:text-white">
              Delegate COMP to {selectedDelegate.name}
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
                      className="w-full bg-transparent dark:text-gray-100 focus:outline-none text-xl font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <div className="flex items-center mr-3 ml-2">
                      <button 
                        onClick={() => setAmount(formattedCompBalance)}
                        className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#E5E7EB] dark:bg-[#2d3d4d] text-[#374151] dark:text-white hover:bg-[#D1D5DB] dark:hover:bg-[#3d4d5d] transition-colors mr-2"
                      >
                        MAX
                      </button>
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
              } transition-all duration-200 font-semibold transform hover:scale-105 active:scale-95 w-full text-sm bg-[#10b981e0] text-white py-3 text-center rounded-full flex justify-center items-center ${
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
              <div className="">Delegated votes</div>
              <div className="">
                {Number(selectedDelegate?.distributed || "0").toFixed(2)} COMP
              </div>
            </div>
            <div className="flex justify-between items-center mt-4 text-sm font-medium text-[#6D7C8D]">
              <div className="">Reward Rate</div>
              <div className="">
                {selectedDelegate?.rewardAPR}
              </div>
            </div>
            {/* <div className="flex justify-between items-center mt-4 text-sm font-medium text-[#6D7C8D]">
              <div className="">Last active</div>
              <div className="">7 days ago</div>
            </div>
            <div className="flex justify-between items-center mt-4 text-sm font-medium text-[#6D7C8D]">
              <div className="">Profile</div>
              <Link
                href={`/delegate/${selectedDelegate.address}`}
                className="text-sm lowercase cursor-pointer font-medium text-emerald-600 dark:text-emerald-500 focus:outline-none"
              >
                @{formatNameForDisplay(selectedDelegate.name)}
              </Link>
            </div> */}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Delegates;
