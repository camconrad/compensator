"use client"

import { useRef, useEffect, useState } from "react"
import { Swiper, SwiperSlide } from "swiper/react"
import { Navigation, FreeMode } from "swiper/modules"
import { ArrowLeft, ArrowRight, TrendingUp, TrendingDown } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { LineChart, Line, ResponsiveContainer } from "recharts"
import "swiper/css"
import "swiper/css/free-mode"

// Mock data for analytics
const analytics = [
  {
    id: 1,
    value: "$0.00",
    type: "Volume",
    change: "+12%",
    trend: "up",
    data: [
      { value: 400 },
      { value: 300 },
      { value: 500 },
      { value: 700 },
      { value: 600 },
      { value: 800 },
      { value: 1000 },
    ],
  },
  {
    id: 2,
    value: "12.24k",
    type: "Delegates",
    change: "+8%",
    trend: "up",
    data: [
      { value: 1200 },
      { value: 1400 },
      { value: 1300 },
      { value: 1800 },
      { value: 2000 },
      { value: 2200 },
      { value: 2400 },
    ],
  },
  {
    id: 3,
    value: "219.84k",
    type: "Holders",
    change: "+5%",
    trend: "up",
    data: [
      { value: 20000 },
      { value: 20500 },
      { value: 21000 },
      { value: 21200 },
      { value: 21800 },
      { value: 22500 },
      { value: 23000 },
    ],
  },
  {
    id: 4,
    value: "411",
    type: "Proposals",
    change: "-3%",
    trend: "down",
    data: [{ value: 100 }, { value: 95 }, { value: 90 }, { value: 85 }, { value: 80 }, { value: 75 }, { value: 70 }],
  },
  {
    id: 5,
    value: "40",
    type: "Proposers",
    change: "+15%",
    trend: "up",
    data: [{ value: 5 }, { value: 8 }, { value: 12 }, { value: 15 }, { value: 20 }, { value: 25 }, { value: 30 }],
  },
  {
    id: 6,
    value: "N/A",
    type: "Placeholder 1",
    change: "+7%",
    trend: "up",
    data: [
      { value: 100 },
      { value: 150 },
      { value: 200 },
      { value: 250 },
      { value: 300 },
      { value: 350 },
      { value: 400 },
    ],
  },
  {
    id: 7,
    value: "N/A",
    type: "Placeholder 2",
    change: "-2%",
    trend: "down",
    data: [
      { value: 350 },
      { value: 340 },
      { value: 330 },
      { value: 320 },
      { value: 310 },
      { value: 300 },
      { value: 290 },
    ],
  },
]

const AnalyticsCard = ({ metric }: { metric: (typeof analytics)[0] }) => {
  const [open, setOpen] = useState(false)
  const chartColor = metric.trend === "up" ? "#10B981" : "#EF4444"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          className="bg-white border border-[#efefef] dark:border-[#28303e] flex flex-col justify-between h-auto w-full dark:bg-[#1D2833] rounded-lg p-5 shadow-sm transition-all duration-200 cursor-pointer"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <div className="flex flex-col gap-2">
            <h3 className="text-2xl font-bold text-[#030303] dark:text-white">{metric.value}</h3>
            <p className="text-sm font-[500] text-[#959595]">{metric.type}</p>
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-[280px] p-0 overflow-hidden"
        sideOffset={5}
        side="top"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <div className="bg-white dark:bg-[#1D2833] rounded-t-md">
          <div className="p-4">
            <div className="flex justify-between items-center mb-1">
              <h4 className="font-semibold text-base">{metric.type}</h4>
              <div
                className={`flex items-center gap-1 text-sm font-medium ${
                  metric.trend === "up" ? "text-emerald-600 dark:text-emerald-500" : "text-red-500"
                }`}
              >
                {metric.trend === "up" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {metric.change}
              </div>
            </div>
            <p className="text-2xl font-bold">{metric.value}</p>
          </div>

          <div className="h-[80px] px-4 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metric.data}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={chartColor}
                  strokeWidth={2}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-3 bg-gray-50 dark:bg-[#1D2833] border-t border-gray-100 dark:border-[#28303e] rounded-b-md">
          <div className="flex justify-between items-center font-medium">
            <span className="text-xs text-gray-500 dark:text-gray-400">Last 7 days</span>
            <button className="text-xs underline text-emerald-600 dark:text-emerald-500 focus:outline-none">
              Dune
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

const Analytics = () => {
  const navigationPrevRef = useRef(null)
  const navigationNextRef = useRef(null)
  const swiperRef = useRef<any>(null)

  useEffect(() => {
    if (swiperRef.current && typeof swiperRef.current.params.navigation === "object" && swiperRef.current.params.navigation) {
      swiperRef.current.params.navigation.prevEl = navigationPrevRef.current;
      swiperRef.current.params.navigation.nextEl = navigationNextRef.current;
      swiperRef.current.navigation.init();
      swiperRef.current.navigation.update();
    }
  }, []);

  return (
    <div className="w-full mt-8 max-w-[1100px] mx-auto font-sans">
      <div className="mx-auto px-4">
        <h2 className="text-[24px] sm:text-2xl mb-2 font-bold text-[#030303] dark:text-white">Analytics</h2>

        <div className="relative">
          <Swiper
            modules={[Navigation, FreeMode]}
            spaceBetween={16}
            freeMode={true}
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
            navigation={{
              prevEl: navigationPrevRef.current,
              nextEl: navigationNextRef.current,
            }}
            onSwiper={(swiper) => {
              swiperRef.current = swiper
            }}
          >
            {analytics.map((metric) => (
              <SwiperSlide key={metric.id} className="">
                <AnalyticsCard metric={metric} />
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
        <div className="flex justify-center items-center gap-2 mt-8">
          <button
            ref={navigationPrevRef}
            className="p-2 border border-[#dde0e0] dark:border-[#232F3B] rounded-full hover:bg-white dark:hover:bg-[#1D2833] transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          </button>
          <button
            ref={navigationNextRef}
            className="p-2 border border-[#dde0e0] dark:border-[#232F3B] rounded-full hover:bg-white dark:hover:bg-[#1D2833] transition-colors"
          >
            <ArrowRight className="w-6 h-6 text-gray-700 dark:text-gray-300" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default Analytics
