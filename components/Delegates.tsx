"use client"

import { useState, useRef } from "react"
import { Swiper, SwiperSlide } from "swiper/react"
import { Navigation, FreeMode } from "swiper/modules"
import "swiper/css"
import "swiper/css/free-mode"
import 'swiper/css/navigation'
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, ArrowRight } from "lucide-react"

const delegates = [
  {
    id: 1,
    name: "a16z",
    address: "0x123..4567",
    image: "/delegates/a16z.jpg",
    rewardAPR: "0.00%",
    link: "/delegates/a16z",
  },
  {
    id: 2,
    name: "Gauntlet",
    address: "0x123..4567",
    image: "/delegates/gauntlet.png",
    rewardAPR: "0.00%",
    link: "/delegates/gauntlet",
  },
  {
    id: 3,
    name: "Geoffrey Hayes",
    address: "0x123..4567",
    image: "/delegates/geoffrey-hayes.jpg",
    rewardAPR: "0.00%",
    link: "/delegates/geoffrey-hayes",
  },
  {
    id: 4,
    name: "Tennis Bowl",
    address: "0x123..4567",
    image: "/delegates/tennis-bowling.jpg",
    rewardAPR: "0.00%",
    link: "/delegates/tennis-bowl",
  },
  {
    id: 5,
    name: "Monet Supply",
    address: "0x123..4567",
    image: "/delegates/monet-supply.jpg",
    rewardAPR: "0.00%",
    link: "/delegates/monet-supply",
  },
  {
    id: 6,
    name: "allthecolors",
    address: "0x123..4567",
    image: "/delegates/all-the-colors.jpg",
    rewardAPR: "0.00%",
    link: "/delegates/monet-supply",
  },
]

const Delegates = () => {
  const [sortBy, setSortBy] = useState("rank")
  const navigationPrevRef = useRef(null)
  const navigationNextRef = useRef(null)

  // Sort delegates based on the selected option
  const sortedDelegates = [...delegates].sort((a, b) => {
    if (sortBy === "apr") {
      const aprA = Number.parseFloat(a.rewardAPR)
      const aprB = Number.parseFloat(b.rewardAPR)
      return aprB - aprA // Sort by highest APR
    }
    return a.id - b.id
  })

  return (
    <div className="w-full max-w-[1100px] mx-auto font-sans">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
          <h2 className="text-[24px] sm:text-2xl font-bold text-[#030303] dark:text-white">Delegates</h2>
          <div className="flex items-center gap-2">
            <div className="flex bg-white dark:bg-gray-800 rounded-full p-1 transition-all duration-100 ease-linear">
              <button
                onClick={() => setSortBy("rank")}
                className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${
                  sortBy === "rank"
                    ? "bg-[#EFF2F5] dark:bg-gray-700 text-[#030303] dark:text-white shadow-sm"
                    : "text-[#959595] dark:text-gray-400 hover:text-[#030303] dark:hover:text-gray-200"
                }`}
              >
                Rank
              </button>
              <button
                onClick={() => setSortBy("apr")}
                className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${
                  sortBy === "apr"
                    ? "bg-[#EFF2F5] dark:bg-gray-700 text-[#030303] dark:text-white shadow-sm"
                    : "text-[#959595] dark:text-gray-400 hover:text-[#030303] dark:hover:text-gray-200"
                }`}
              >
                APR
              </button>
            </div>
          </div>
        </div>

        <div className="relative">
          <Swiper
            modules={[Navigation, FreeMode]}
            spaceBetween={16}
            slidesPerView="auto"
            freeMode={true}
            navigation={{
              prevEl: navigationPrevRef.current,
              nextEl: navigationNextRef.current,
            }}
            // autoplay={{ delay: 5000, disableOnInteraction: true }}
            className="!overflow-visible"
            onInit={(swiper) => {
              if (swiper.params.navigation) {
                swiper.params.navigation.prevEl = navigationPrevRef.current;
                swiper.params.navigation.nextEl = navigationNextRef.current;
                swiper.navigation.init();
                swiper.navigation.update();
              }
            }}
          >
            {sortedDelegates.map((delegate) => (
              <SwiperSlide key={delegate.id} className="!w-[260px]">
                <Link href={delegate.link}>
                  <div className="group bg-white flex flex-col justify-between min-h-[206px] w-full dark:bg-gray-800 rounded-xl shadow-sm p-5 duration-200 relative overflow-hidden">
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
                        <p className="text-sm font-medium text-[#959595]">{delegate.address}</p>
                      </div>
                    </div>
                    <div className="mt-2 transition-transform duration-200 group-hover:-translate-y-12">
                      <p className="text-xl font-bold text-[#030303] dark:text-white">{delegate.rewardAPR}</p>
                      <p className="text-sm font-medium text-[#959595]">Reward APR</p>
                    </div>
                    <button className="absolute transition-all duration-200 transform hover:scale-105 active:scale-95 bottom-3 w-[90%] left-0 right-0 mx-auto text-sm bg-[#10b981] text-white py-[10px] text-center font-medium rounded-full opacity-0 group-hover:opacity-100 translate-y-full group-hover:translate-y-0">
                      Delegate
                    </button>
                  </div>
                </Link>
              </SwiperSlide>
            ))}
          </Swiper>
          <div className="flex justify-center items-center gap-2 mt-8">
            <button
              ref={navigationPrevRef}
              className="p-2 border border-gray-300 dark:border-[#232F3B] rounded-full hover:bg-white dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            </button>
            <button
              ref={navigationNextRef}
              className="p-2 border border-gray-300 dark:border-[#232F3B] rounded-full hover:bg-white dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowRight className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Delegates
