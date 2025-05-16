"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSettingTheme } from "@/store/setting/selector"

interface Slide {
  titlePrimary: string;
  titleSecondary: string;
  imageLight: string;
  imageDark: string;
  imageHeight: string;
  marginTop: string;
  marginLeft: string;
}

const HeroBanner = () => {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [autoplay, setAutoplay] = useState(true)
  const theme = useSettingTheme()

  const slides: Slide[] = [
    {
      titlePrimary: "Delegate Compound (COMP)",
      titleSecondary: "to accrue COMP rewards in real-time.",
      imageLight: "/delegate-light.png",
      imageDark: "/delegate-dark.png",
      imageHeight: "230px",
      marginTop: "-30px",
      marginLeft: "0px",
    },
    {
      titlePrimary: "Stake Compound (COMP)",
      titleSecondary: "for or against specific proposals.",
      imageLight: "/stake-light.png",
      imageDark: "/stake-dark.png",
      imageHeight: "180px",
      marginTop: "0px",
      marginLeft: "-40px",
    },
  ]

  const getImage = (slide: Slide) => {
    return theme === "light" ? slide.imageLight : slide.imageDark
  }

  useEffect(() => {
    if (!autoplay) return

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [autoplay, slides.length])

  const handlePrev = () => {
    setAutoplay(false)
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
  }

  const handleNext = () => {
    setAutoplay(false)
    setCurrentSlide((prev) => (prev + 1) % slides.length)
  }

  return (
    <div 
      className="sm:flex items-center hidden justify-center py-8 px-4 w-full max-w-[1100px] mx-auto"
    >
      <div className="relative max-w-7xl w-full mt-[-12px] mx-auto overflow-hidden rounded-lg shadow-sm h-[180px] bg-white dark:bg-[#1D2833] border border-[#efefef] dark:border-[#28303e]">
        {/* Carousel Content */}
        <div className="h-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="relative h-full p-8 md:p-12 overflow-hidden"
            >
              <div className="flex flex-col justify-center max-w-[50%] z-10 relative pl-6">
                <h1 className="text-2xl md:text-3xl font-bold text-[#030303] dark:text-white mb-1 mt-[6px]">
                  {slides[currentSlide].titlePrimary}
                </h1>
                <p className="text-xl md:text-2xl font-medium text-[#6D7C8D]">
                  {slides[currentSlide].titleSecondary}
                </p>
              </div>
              <div className="absolute right-[-4%] top-[58%] transform -translate-y-1/2 h-full"
                style={{ marginTop: slides[currentSlide].marginTop }}>
                <img
                  src={getImage(slides[currentSlide]) || "/placeholder.svg"}
                  alt="Slide illustration"
                  style={{ 
                    height: slides[currentSlide].imageHeight,
                    marginLeft: slides[currentSlide].marginLeft
                  }}
                  className="w-auto object-contain"
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Indicators */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex space-x-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setAutoplay(false)
                setCurrentSlide(index)
              }}
              className={`w-2 h-2 rounded-full transition-all focus:outline-none ${
                currentSlide === index ? "bg-primary w-4" : "bg-gray-300 dark:bg-gray-600"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default HeroBanner
