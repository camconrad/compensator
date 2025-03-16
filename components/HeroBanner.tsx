"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

const HeroBanner = () => {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [autoplay, setAutoplay] = useState(true)

  const slides = [
    {
      titlePrimary: "Delegate Compound (COMP)",
      titleSecondary: "to accrue COMP rewards in real-time.",
      image: "/placeholder.svg?height=120&width=200",
    },
    {
      titlePrimary: "Stake Compound (COMP)",
      titleSecondary: "for or against specific proposals.",
      image: "/placeholder.svg?height=120&width=200",
    },
    {
      titlePrimary: "Join the Compound community.",
      titleSecondary: "The future of money is in your hands.",
      image: "/placeholder.svg?height=120&width=200",
    },
  ]

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
    <div className="flex items-center mt-[-12px] justify-center py-8 px-4 w-full max-w-[1100px] mx-auto">
      <div className="relative max-w-7xl w-full mx-auto overflow-hidden rounded-lg shadow-sm h-[180px] bg-white dark:bg-gray-800">
        {/* Carousel Content */}
        <div className="h-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full p-8 md:p-12"
            >
              <div className="flex flex-col justify-center">
                <h1 className="text-2xl md:text-3xl font-bold text-[#030303] dark:text-white mb-1">
                  {slides[currentSlide].titlePrimary}
                </h1>
                <p className="text-xl md:text-2xl font-medium text-[#959595]">
                  {slides[currentSlide].titleSecondary}
                </p>
              </div>
              <div className="hidden md:flex items-center justify-end">
                <motion.img
                  src={slides[currentSlide].image}
                  alt="Slide illustration"
                  className="max-h-[120px] object-contain"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
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
              className={`w-2 h-2 rounded-full transition-all ${
                currentSlide === index ? "bg-primary w-6" : "bg-gray-300 dark:bg-gray-600"
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