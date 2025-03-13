"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay, FreeMode } from "swiper/modules";
import "swiper/css";
import "swiper/css/free-mode";

// Mock data for analytics
const analytics = [
  {
    id: 1,
    value: "$0.00",
    type: "Volume",
  },
  {
    id: 2,
    value: "12.24k",
    type: "Delegates",
  },
  {
    id: 3,
    value: "219.84k",
    type: "Holders",
  },
  {
    id: 4,
    value: "411",
    type: "Proposals",
  },
  {
    id: 5,
    value: "40",
    type: "Proposers",
  },
  {
    id: 6,
    value: "N/A",
    type: "Placeholder",
  },
];

const Analytics = () => {
  return (
    <div className="w-full mt-8 max-w-[1100px] mx-auto">
      <div className="container mx-auto px-4">
        <h2 className="text-[24px] sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Analytics
        </h2>

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
            {analytics.map((metric) => (
              <SwiperSlide key={metric.id} className="!w-auto min-w-[220px]">
                <div className="bg-white font-[family-name:var(--font-geist-sans)] dark:bg-gray-800 rounded-xl shadow-sm p-5 hover:opacity-75 transition-opacity duration-200">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {metric.value}
                    </h3>
                    <p className="text-sm font-medium text-[#959595]">{metric.type}</p>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
