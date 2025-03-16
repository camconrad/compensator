"use client";

import { useState, useRef, useEffect } from "react";
import { Swiper, SwiperSlide, SwiperRef } from "swiper/react";
import { Navigation, FreeMode } from "swiper/modules";
import "swiper/css";
import "swiper/css/free-mode";
import "swiper/css/navigation";
import Image from "next/image";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Modal from "@/components/common/Modal";

interface Delegate {
  id: number;
  name: string;
  address: string;
  image: string;
  rewardAPR: string;
}

const delegates: Delegate[] = [
  {
    id: 1,
    name: "a16z",
    address: "0x123..4567",
    image: "/delegates/a16z.jpg",
    rewardAPR: "0.00%",
  },
  {
    id: 2,
    name: "Gauntlet",
    address: "0x123..4567",
    image: "/delegates/gauntlet.png",
    rewardAPR: "0.00%",
  },
  {
    id: 3,
    name: "Geoffrey Hayes",
    address: "0x123..4567",
    image: "/delegates/geoffrey-hayes.jpg",
    rewardAPR: "0.00%",
  },
  {
    id: 4,
    name: "Tennis Bowling",
    address: "0x123..4567",
    image: "/delegates/tennis-bowling.jpg",
    rewardAPR: "0.00%",
  },
  {
    id: 5,
    name: "Monet Supply",
    address: "0x123..4567",
    image: "/delegates/monet-supply.jpg",
    rewardAPR: "0.00%",
  },
  {
    id: 6,
    name: "allthecolors",
    address: "0x123..4567",
    image: "/delegates/all-the-colors.jpg",
    rewardAPR: "0.00%",
  },
];

const Delegates = () => {
  const [sortBy, setSortBy] = useState("rank");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDelegate, setSelectedDelegate] = useState<Delegate | null>(null);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const swiperRef = useRef<SwiperRef | null>(null);
  const navigationPrevRef = useRef(null);
  const navigationNextRef = useRef(null);

    const userBalance = 0.00;

  const sortedDelegates = [...delegates].sort((a, b) => {
    if (sortBy === "apr") {
      const aprA = Number.parseFloat(a.rewardAPR);
      const aprB = Number.parseFloat(b.rewardAPR);
      return aprB - aprA;
    }
    return a.id - b.id;
  });

  // useEffect(() => {
  //   if (swiperRef.current && swiperRef.current.swiper) {
  //     const swiperInstance = swiperRef.current.swiper;
  //     swiperInstance.navigation.init();
  //     swiperInstance.navigation.update();
  //   }
  // }, []);

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

  const handleDelegateSubmit = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 2000);
  };

  return (
    <div className="w-full max-w-[1100px] mx-auto font-sans">
      <div className="mx-auto px-4">
        <div className="flex flex-row justify-between items-center gap-2 mb-4">
          <h2 className="text-[24px] sm:text-2xl font-bold text-[#030303] dark:text-white mb-[-10px] md:mb-[-12px]">
            Delegates
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex mb-[-6px] md:mb-[0px] bg-white dark:bg-[#1D2833] rounded-full p-1 transition-all duration-100 ease-linear">
              <button
                onClick={() => setSortBy("rank")}
                className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${
                  sortBy === "rank"
                    ? "bg-[#EFF2F5] dark:bg-[#2d3d4d] text-[#030303] dark:text-white shadow-sm"
                    : "text-[#959595] dark:text-gray-400 hover:text-[#030303] dark:hover:text-gray-200"
                }`}
              >
                Rank
              </button>
              <button
                onClick={() => setSortBy("apr")}
                className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${
                  sortBy === "apr"
                    ? "bg-[#EFF2F5] dark:bg-[#2d3d4d] text-[#030303] dark:text-white shadow-sm"
                    : "text-[#959595] dark:text-gray-400 hover:text-[#030303] dark:hover:text-gray-200"
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
            prevEl: '.swiper-prev-btn-delegates',
            nextEl: '.swiper-next-btn-delegates',
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
          onInit={(swiper) => {
          }}
        >
          {sortedDelegates.map((delegate, index) => (
            <SwiperSlide key={delegate.id} className="">
              <div
                onClick={() => handleCardClick(delegate)}
                className="group bg-white flex flex-col justify-between min-h-[206px] w-full dark:bg-[#1D2833] rounded-lg shadow-sm p-5 duration-200 relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="relative h-12 w-12 flex-shrink-0">
                    <Image
                      src={delegate.image || "/placeholder.svg"}
                      alt={delegate.name}
                      fill
                      className="object-cover rounded-full"
                    />
                  </div>
                  <div className="truncate">
                    <h3 className="text-lg font-semibold text-[#030303] dark:text-white truncate">
                      {delegate.name}
                    </h3>
                    <p className="text-sm font-medium text-[#959595]">
                      {delegate.address}
                    </p>
                  </div>
                </div>
                <div className="flex justify-between items-end mt-2 transition-transform duration-200 group-hover:-translate-y-12">
                  <div>
                    <p className="text-xl font-bold text-[#030303] dark:text-white">
                      #{sortBy === "apr" ? index + 1 : delegate.id}
                    </p>
                    <p className="text-sm font-medium text-[#959595]">Rank</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-[#030303] dark:text-white">
                      {delegate.rewardAPR}
                    </p>
                    <p className="text-sm font-medium text-[#959595]">
                      Reward APR
                    </p>
                  </div>
                </div>
                <button
                  onClick={(event) => handleButtonClick(event, delegate)}
                  className="absolute transition-all duration-200 transform hover:scale-105 active:scale-95 bottom-3 w-[90%] left-0 right-0 mx-auto text-sm bg-[#10b981] text-white py-[10px] text-center font-semibold  rounded-full opacity-0 group-hover:opacity-100 translate-y-full group-hover:translate-y-0"
                >
                  Delegate
                </button>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
        <div className="flex justify-center items-center gap-2 mt-8">
          <button
            className="swiper-prev-btn-delegates p-2 border border-gray-300 dark:border-[#232F3B] rounded-full hover:bg-white dark:hover:bg-[#1D2833] transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          </button>
          <button
            className="swiper-next-btn-delegates p-2 border border-gray-300 dark:border-[#232F3B] rounded-full hover:bg-white dark:hover:bg-[#1D2833] transition-colors"
          >
            <ArrowRight className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          </button>
        </div>
      </div>

      {isModalOpen && selectedDelegate && (
        <Modal handleClose={handleModalClose} open={isModalOpen}>
          <div className="p-6 font-[family-name:var(--font-geist-sans)]">
            <h2 className="mt-7 text-xl font-semibold mb-4 dark:text-white">
              Delegate COMP to {selectedDelegate.name}
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
                        alt="COMP Logo"
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
                    <p className="text-xs text-[#959595]">$0.00</p>
                    <p className="text-xs text-[#959595]">Balance: {userBalance.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[25, 50, 75, 100].map((percent) => (
                <button
                  key={percent}
                  onClick={() => setAmount(((percent / 100) * userBalance).toString())}
                  className="py-[4px] border border-[#efefef] dark:border-[#2e3746] rounded-full text-sm hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-200 transition-colors"
                >
                  {percent}%
                </button>
              ))}
            </div>
            <button
              onClick={handleDelegateSubmit}
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
                "Delegate COMP"
              )}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default Delegates
