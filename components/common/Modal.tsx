"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { IoMdClose } from "react-icons/io"
import { motion } from "framer-motion"
import { ArrowLeft, Repeat, Settings, Loader } from "lucide-react"

interface ModalProps {
  open: boolean
  handleClose: () => void
  className?: string
  title?: string
  hideCloseIcon?: boolean
  children?: React.ReactNode
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2, ease: "easeInOut" } },
}

const sidebarVariants = {
  hidden: { x: "100%", opacity: 0 },
  visible: { x: "0", opacity: 1, transition: { duration: 0.3, ease: "easeInOut" } },
}

const closeButtonVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.1 },
  tap: { scale: 0.95 },
}

const Modal = ({ open, handleClose, className, title, hideCloseIcon = false, children }: ModalProps) => {
  const [showSwapUI, setShowSwapUI] = useState(false)
  const [fromToken, setFromToken] = useState("ETH")
  const [toToken, setToToken] = useState("COMP")
  const [fromAmount, setFromAmount] = useState("")
  const [toAmount, setToAmount] = useState("")
  const [slippageTolerance, setSlippageTolerance] = useState(0.5) // Default slippage
  const [isSwapping, setIsSwapping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tokenBalances, setTokenBalances] = useState<Record<string, number>>({
    ETH: 0,
    WBTC: 0,
    USDT: 0,
    USDC: 0,
    COMP: 0,
  })
  const [showSlippagePopover, setShowSlippagePopover] = useState(false)

  useEffect(() => {
    const originalOverflow = document.body.style.overflowY
    document.body.style.overflowY = open ? "hidden" : "auto"
    return () => {
      document.body.style.overflowY = originalOverflow
    }
  }, [open])

  const handleSwapClick = () => {
    setShowSwapUI(true)
  }

  const handleBackClick = () => {
    setShowSwapUI(false)
  }

  const handleSwapTokens = () => {
    const tempToken = fromToken
    setFromToken(toToken)
    setToToken(tempToken)
    setFromAmount("")
    setToAmount("")
  }

  const handleSwap = async () => {
    if (!fromAmount || Number.parseFloat(fromAmount) <= 0) {
      setError("Please enter a valid amount")
      return
    }

    if (Number.parseFloat(fromAmount) > tokenBalances[fromToken]) {
      setError("Insufficient balance")
      return
    }

    setIsSwapping(true)
    setError(null)

    // Simulate a swap API call
    setTimeout(() => {
      setIsSwapping(false)
      setFromAmount("")
      setToAmount("")
      setShowSwapUI(false)
      alert("Swap successful!")
    }, 2000)
  }

  const handleSlippageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseFloat(e.target.value)
    if (!isNaN(value) && value >= 0) {
      setSlippageTolerance(value)
    }
  }

  const handleCustomSlippage = () => {
    const custom = prompt("Enter custom slippage (%):", slippageTolerance.toString())
    const value = Number.parseFloat(custom || "0.5")
    if (!isNaN(value) && value > 0) {
      setSlippageTolerance(value)
    }
  }

  if (!open) return null

  return (
    <motion.div
      className="fixed inset-0 z-[1000] bg-white bg-opacity-40 backdrop-blur-sm dark:bg-[#0D131A] dark:bg-opacity-40 flex justify-end"
      onClick={handleClose}
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={backdropVariants}
    >
      <motion.div
        className={`${className} h-screen w-full max-w-sm border-l border-[#efefef] dark:border-[#151f29] bg-white dark:bg-[#0D131A] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
        variants={sidebarVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
        layout
      >
        {showSwapUI ? (
          <motion.div
            key="swap-ui"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col h-full"
          >
            <div className="flex justify-between items-center px-6 py-4 border-b border-[#efefef] dark:border-[#151f29]">
              <motion.div
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[#ccd3d9] dark:bg-gray-800 bg-opacity-20 hover:bg-opacity-30"
                onClick={handleBackClick}
                variants={closeButtonVariants}
                initial="rest"
                whileHover="hover"
                whileTap="tap"
              >
                <ArrowLeft className="h-4 w-4 dark:text-gray-300" />
              </motion.div>

              <motion.h3
                className="text-xl font-semibold dark:text-white"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                Buy COMP
              </motion.h3>

              <div className="relative">
                <motion.div
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[#ccd3d9] dark:bg-gray-800 bg-opacity-20 hover:bg-opacity-30"
                  onClick={() => setShowSlippagePopover(!showSlippagePopover)}
                  variants={closeButtonVariants}
                  initial="rest"
                  whileHover="hover"
                  whileTap="tap"
                >
                  <Settings className="h-4 w-4 dark:text-gray-300" />
                </motion.div>

                {/* Slippage Popover */}
                {showSlippagePopover && (
                  <motion.div
                    className="absolute top-12 right-0 bg-white dark:bg-[#1D2833] rounded-lg shadow-lg p-4 w-48 z-50"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => setSlippageTolerance(0.5)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                          slippageTolerance === 0.5
                            ? "bg-[#EFF2F5] dark:bg-[#2d3d4d] text-[#030303] dark:text-white"
                            : "text-[#959595] dark:text-gray-400 hover:text-[#030303] dark:hover:text-gray-200"
                        }`}
                      >
                        0.5%
                      </button>
                      <button
                        onClick={handleCustomSlippage}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium ${
                          slippageTolerance !== 0.5
                            ? "bg-[#EFF2F5] dark:bg-[#2d3d4d] text-[#030303] dark:text-white"
                            : "text-[#959595] dark:text-gray-400 hover:text-[#030303] dark:hover:text-gray-200"
                        }`}
                      >
                        Custom
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Rest of the Swap UI */}
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="relative">
              <div className="rounded-xl bg-[#EFF2F5] font-medium dark:bg-gray-800/50 p-3 mb-1">
                <div className="flex justify-between mb-0 items-center">
                    <div className="gap-4 flex flex-col">
                      {/* <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Sell</span> */}
                      <input
                          type="number"
                          placeholder="0.00"
                          className="w-full border-none font-semibold bg-transparent text-xl focus:outline-none dark:text-white"
                          value={fromAmount}
                          onChange={(e) => setFromAmount(e.target.value)}
                        />
                      <span className="text-sm text-gray-500 font-medium dark:text-gray-400">
                        $0.00
                      </span>
                    </div>
                    <div className="flex flex-col gap-4">
                      <select
                        className="border-none bg-gray-200 focus:outline-none dark:bg-gray-700 rounded-lg px-2 py-2 text-sm font-semibold dark:text-white"
                        value={fromToken}
                        onChange={(e) => setFromToken(e.target.value)}
                      >
                        <option value="ETH">ETH</option>
                        <option value="WBTC">WBTC</option>
                        <option value="USDT">USDT</option>
                        <option value="USDC">USDC</option>
                        <option value="COMP">COMP</option>
                      </select>
                      <span className="text-sm text-gray-500 font-medium dark:text-gray-400 mt-1 min-w-[86px]">
                        Balance: {tokenBalances[fromToken].toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Swap Toggle/Switch Button */}
                <div className="absolute left-1/2 transform -translate-x-1/2 -translate-y-[56%] z-10">
                  <motion.div
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-[#EFF2F5] dark:bg-gray-700 border-4 border-white dark:border-[#0D131A]"
                    onClick={handleSwapTokens}
                    variants={closeButtonVariants}
                    initial="rest"
                    whileHover="hover"
                    whileTap="tap"
                  >
                    <Repeat className="h-5 w-5 dark:text-gray-300" />
                  </motion.div>
                </div>

                {/* To Token */}
                <div className="rounded-xl bg-[#EFF2F5] font-medium dark:bg-gray-800/50 p-3 mb-3">
                <div className="flex justify-between mb-0 items-center">
                    <div className="gap-4 flex flex-col">
                      {/* <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Buy</span> */}
                      <input
                          type="number"
                          placeholder="0.00"
                          className="w-full border-none font-semibold bg-transparent text-xl focus:outline-none dark:text-white"
                          value={toAmount}
                          onChange={(e) => setFromAmount(e.target.value)}
                        />
                      <span className="text-sm text-gray-500 font-medium dark:text-gray-400">
                        $0.00
                      </span>
                    </div>
                    <div className="flex flex-col gap-4">
                      <select
                        className="border-none bg-gray-200 focus:outline-none dark:bg-gray-700 rounded-lg px-2 py-2 text-sm font-semibold dark:text-white"
                        value={toToken}
                        onChange={(e) => setToToken(e.target.value)}
                      >
                        <option value="ETH">ETH</option>
                        <option value="WBTC">WBTC</option>
                        <option value="USDT">USDT</option>
                        <option value="USDC">USDC</option>
                        <option value="COMP">COMP</option>
                      </select>
                      <span className="text-sm text-gray-500 font-medium dark:text-gray-400 mt-1 min-w-[86px]">
                        Balance: {tokenBalances[toToken].toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Swap Button */}
                <button
                  className="w-full py-3 bg-[#10b981] text-white font-semibold rounded-full hover:bg-emerald-600 transition-all duration-200 transform hover:scale-105 active:scale-95"
                  onClick={handleSwap}
                  disabled={isSwapping}
                >
                  {isSwapping ? (
                    <svg
                      className="animate-spin mx-auto h-5 w-5 text-white"
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
                  ) : (
                    "Swap"
                  )}
                </button>

                {/* Error Message */}
                {error && <div className="text-sm mt-3 font-medium text-red-500 text-center">{error}</div>}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="original-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col h-full"
          >
            <div className="flex justify-between items-center px-6 py-4 border-b border-[#efefef] dark:border-[#151f29]">
              {title && (
                <motion.h3
                  className="text-xl font-semibold dark:text-white"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {title}
                </motion.h3>
              )}

              <div className="flex gap-2 ml-auto">
                <motion.div
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[#ccd3d9] dark:bg-gray-800 bg-opacity-20 hover:bg-opacity-30"
                  onClick={handleSwapClick}
                  variants={closeButtonVariants}
                  initial="rest"
                  whileHover="hover"
                  whileTap="tap"
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Repeat className="h-4 w-4 dark:text-gray-300" />
                </motion.div>

                {!hideCloseIcon && (
                  <motion.div
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-[#ccd3d9] dark:bg-gray-800 bg-opacity-20 hover:bg-opacity-30"
                    onClick={handleClose}
                    variants={closeButtonVariants}
                    initial="rest"
                    whileHover="hover"
                    whileTap="tap"
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <IoMdClose className="stroke-current text-lg dark:text-gray-300" />
                  </motion.div>
                )}
              </div>
            </div>

            <motion.div
              className="p-6 flex-1 overflow-y-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.13 }}
            >
              {children}
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  )
}

export default Modal
