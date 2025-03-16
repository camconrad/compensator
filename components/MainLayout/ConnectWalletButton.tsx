"use client"

import { useConnectModal } from "@rainbow-me/rainbowkit"
import { motion, AnimatePresence } from "framer-motion"
import { useState, useRef, useEffect } from "react"
import { useAccount, useDisconnect } from "wagmi"
import { Copy, Check, ChevronDown } from "lucide-react"
import Image from "next/image"
import { MouseEvent } from "react"

const ConnectWalletButton = ({ compRewards = "0.0000" }) => {
  const { openConnectModal } = useConnectModal()
  const { address } = useAccount()
  const { disconnectAsync } = useDisconnect()
  const [isLoading, setIsLoading] = useState(false)
  const [showPopover, setShowPopover] = useState(false)
  const [copied, setCopied] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current && 
        !popoverRef.current.contains(event.target as Node) && 
        buttonRef.current && 
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowPopover(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside as unknown as EventListener)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside as unknown as EventListener)
    }
  }, [])

  const handleConnectWallet = async () => {
    setIsLoading(true)
    try {
      openConnectModal && openConnectModal()
    } catch (error) {
      console.error("Error connecting wallet:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisconnectWallet = async () => {
    setIsLoading(true)
    try {
      await disconnectAsync()
      setShowPopover(false)
    } catch (error) {
      console.error("Error disconnecting wallet:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleChangeWallet = () => {
    openConnectModal && openConnectModal()
    setShowPopover(false)
  }

  const copyToClipboard = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const formatAddress = (address: string) => {
    if (!address) return ""
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  const buttonVariants = {
    initial: { scale: 1 },
    hover: { scale: 1.02 },
    tap: { scale: 0.98 },
  }

  const popoverVariants = {
    hidden: {
      opacity: 0,
      scale: 0.98,
      y: -3,
      transition: {
        duration: 0.1,
        ease: [0.4, 0.0, 0.2, 1],
      }
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 500,
        damping: 30,
        mass: 0.5,
        velocity: 5
      }
    }
  }

  // Toggle popover function
  const togglePopover = () => {
    setShowPopover(!showPopover)
  }

  if (!address) {
    return (
      <motion.button
        onClick={handleConnectWallet}
        variants={buttonVariants}
        initial="initial"
        whileHover="hover"
        whileTap="tap"
        disabled={isLoading}
        className={`${
          isLoading ? "opacity-50 cursor-not-allowed" : "hover:scale-105"
        } w-full px-[18px] shadow-sm py-[13px] min-h-[36px] font-semibold text-xs transition-colors bg-[#fefefe] dark:bg-[#1D2833] border-[0.8px] border-emerald-500 dark:border-emerald-700 text-black dark:text-white rounded-full flex justify-center items-center`}
      >
        {isLoading ? (
          <svg
            className="animate-spin h-4 w-4 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        ) : (
          "Connect Wallet"
        )}
      </motion.button>
    )
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-[#F9FAFB] dark:bg-[#17212B] border border-[#efefef] dark:border-[#28303e] shadow-sm pl-3 rounded-full">
        {/* COMP Rewards Display */}
        <div className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="COMP Logo"
            width={20}
            height={20}
            className="mx-auto rounded-full"
          />
          <span className="text-[#030303] dark:text-white font-semibold text-xs">{compRewards}</span>
        </div>

        {/* Connected Wallet Button */}
        <motion.button
          ref={buttonRef}
          onClick={togglePopover}
          variants={buttonVariants}
          initial="initial"
          whileHover="hover"
          whileTap="tap"
          disabled={isLoading}
          className={`
            relative px-4 py-3 rounded-full
            bg-white dark:bg-[#1D2833]
            text-[#030303] font-medium text-sm
            flex items-center gap-2 transition-colors
            border border-[#efefef] dark:border-[#28303e]
          `}
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#030303] dark:text-white text-xs">{formatAddress(address)}</span>
          </div>
        </motion.button>
      </div>

      {/* Animated Popover with Bounce Effect */}
      <AnimatePresence>
        {showPopover && (
          <motion.div
            ref={popoverRef}
            className="absolute font-medium right-0 mt-2 w-full min-w-[310px] bg-white dark:bg-[#1D2833] rounded-xl shadow-lg z-10 border border-[#efefef] dark:border-[#28303E] overflow-hidden"
            variants={popoverVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            style={{ 
              originX: 1, 
              originY: 0,
              transformOrigin: "top right" 
            }}
          >
            <div className="p-4">
              <h3 className="text-[#030303] dark:text-gray-400 font-semibold text-xs mb-3">Connected Wallet</h3>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500"></span>
                  <span className="text-[#030303] dark:text-white text-xs font-semibold">{formatAddress(address)}</span>
                </div>
                <motion.button 
                  onClick={copyToClipboard} 
                  className="text-[#030303] dark:text-white p-1 hover:text-[#030303]/80 hover:dark:text-white/80 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Copy className="h-3 w-3" />
                </motion.button>
              </div>
              <motion.button
                onClick={handleDisconnectWallet}
                className="w-full py-3 px-4 text-xs font-semibold bg-[#D7DFE4] dark:bg-[#2B3947] hover:bg-[#c7d1d6] dark:hover:bg-[#2F3E4D] text-[#030303] dark:text-white rounded-full mb-2 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Disconnect Wallet
              </motion.button>
              <motion.button
                onClick={handleChangeWallet}
                className="w-full py-3 px-4 text-xs font-semibold bg-[#D7DFE4] dark:bg-[#2B3947] hover:bg-[#c7d1d6] dark:hover:bg-[#2F3E4D] text-[#030303] dark:text-white rounded-full transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Change Wallet
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ConnectWalletButton