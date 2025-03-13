"use client"

import { Swiper, SwiperSlide } from "swiper/react"
import { Navigation, Autoplay, FreeMode } from "swiper/modules"
import "swiper/css"
// import "swiper/css/navigation"
// import "swiper/css/pagination"
import "swiper/css/free-mode"
import Image from "next/image"
import Link from "next/link"

// Mock data for delegates
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
  return (
    <div className="w-full max-w-[1100px] mx-auto">
      <div className="container mx-auto px-4">
        <h2 className="text-[24px] sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">Delegates</h2>

        <div className="overflow-hidden">
          <Swiper
            modules={[Navigation, FreeMode, Autoplay]}
            spaceBetween={16}
            slidesPerView="auto"
            freeMode={true}
            navigation
            autoplay={{ delay: 5000, disableOnInteraction: true }}
            className="!overflow-visible"
          >
            {delegates.map((delegate) => (
              <SwiperSlide key={delegate.id} className="!w-auto max-w-[280px]">
                <Link href={delegate.link}>
                  <div className="bg-white dark:bg-gray-800 font-[family-name:var(--font-geist-sans)] rounded-xl shadow-sm p-5 hover:opacity-75 transition-opacity duration-200">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="relative h-12 w-12 flex-shrink-0">
                        <Image
                          src={delegate.image || "/placeholder.svg"}
                          alt={delegate.name}
                          fill
                          className="object-cover rounded-full"
                        />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">{delegate.name}</h3>
                        <p className="text-sm font-medium text-[#959595]">{delegate.address}</p>
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-xl font-bold text-gray-900 dark:text-white">{delegate.rewardAPR}</p>
                      <p className="text-sm font-medium text-[#959595]">Reward APR</p>
                    </div>
                  </div>
                </Link>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </div>
  )
}

export default Delegates
