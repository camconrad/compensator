"use client"

import { useConnectModal } from "@rainbow-me/rainbowkit"
import { motion, AnimatePresence } from "framer-motion"
import { useState, useRef, useEffect } from "react"
import { useAccount, useDisconnect } from "wagmi"
import { Copy, ChevronDown, ChevronUp } from "lucide-react"
import { FaWallet } from "react-icons/fa"
import Image from "next/image"
import type { MouseEvent } from "react"
import { createPortal } from "react-dom"
import { useGetCompensatorContract } from "@/hooks/useGetCompensatorContract"
import { useGetCompensatorFactoryContract } from "@/hooks/useGetCompensatorFactoryContract"
import { useDelegationRewards } from "@/hooks/useConvexDelegations"
import { wagmiConfig } from "@/app/providers"
import { waitForTransactionReceipt } from "@wagmi/core"
import { ethers, formatUnits } from "ethers"
import { getEthersSigner } from "@/hooks/useEtherProvider"
import toast from "react-hot-toast"

const ConnectWalletButton = ({ isMobile = false }) => {
  const [isClient, setIsClient] = useState(false)
  
  useEffect(() => {
    setIsClient(true)
  }, [])

  const { openConnectModal } = useConnectModal()
  const { address } = useAccount()
  const { disconnectAsync } = useDisconnect()
  const [isLoading, setIsLoading] = useState(false)
  const [isClaimLoading, setIsClaimLoading] = useState(false)
  const [showPopover, setShowPopover] = useState(false)
  const [copied, setCopied] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [showCompPopover, setShowCompPopover] = useState(false)
  const compPopoverRef = useRef<HTMLDivElement>(null)
  const compButtonRef = useRef<HTMLButtonElement>(null)
  const [isEthereumExpanded, setIsEthereumExpanded] = useState(false)
  const [claimSuccess, setClaimSuccess] = useState(false)
  const [walletBalance, setWalletBalance] = useState("0.0000")
  const [isFaucetLoading, setIsFaucetLoading] = useState(false)

  const { handleSetCompensatorContract } = useGetCompensatorContract()
  const { compensatorFactoryContract } = useGetCompensatorFactoryContract()
  
  const { delegationRewards } = useDelegationRewards(address)
  
  const pendingRewards = delegationRewards?.totalRewards?.toFixed(4) || "0.0000"

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        compPopoverRef.current &&
        !compPopoverRef.current.contains(event.target as Node) &&
        compButtonRef.current &&
        !compButtonRef.current.contains(event.target as Node)
      ) {
        setShowCompPopover(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside as unknown as EventListener)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside as unknown as EventListener)
    }
  }, [])

  useEffect(() => {
    if (!showCompPopover) {
      setClaimSuccess(false)
    }
  }, [showCompPopover])

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
      toast.success("Wallet disconnected", {
        style: {
          fontWeight: "600",
        },
      })
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

  const handleFaucetClaim = async () => {
    if (!address) {
      toast.error("Please connect your wallet first", {
        style: {
          fontWeight: "600",
        },
      })
      return
    }

    setIsFaucetLoading(true)
    try {
      toast.success("Claiming tokens...", {
        style: {
          fontWeight: "600",
        },
      })

      const hasClaimed = localStorage.getItem(`faucet_claimed_${address.toLowerCase()}`)
      if (hasClaimed) {
        toast.error("Already claimed", {
          style: {
            fontWeight: "600",
          },
        })
        return
      }
      
      await new Promise(resolve => setTimeout(resolve, 3000))
      localStorage.setItem(`faucet_claimed_${address.toLowerCase()}`, 'true')
      
      toast.success("Tokens claimed! Check wallet.", {
        style: {
          fontWeight: "600",
        },
      })
      
      setShowPopover(false)
    } catch (error) {
      console.error("Error claiming testnet tokens:", error)
      toast.error("Claim failed. Try again.", {
        style: {
          fontWeight: "600",
        },
      })
    } finally {
      setIsFaucetLoading(false)
    }
  }

  const handleClaimCOMP = async () => {
    if (!address || Number.parseFloat(pendingRewards) <= 0) {
      toast.error("No rewards to claim", {
        style: {
          fontWeight: "600",
        },
      })
      return
    }

    setIsClaimLoading(true)
    try {
      toast.success("Claiming delegation rewards...", {
        style: {
          fontWeight: "600",
        },
      })
      
      const delegateAddress = delegationRewards?.delegationRewards?.[0]?.delegate;
      if (!delegateAddress) {
        throw new Error("No active delegations found");
      }
      
      const delegateCompensatorAddress = await compensatorFactoryContract.getCompensator(delegateAddress);
      if (!delegateCompensatorAddress || delegateCompensatorAddress === ethers.ZeroAddress) {
        throw new Error("Delegate has no Compensator contract");
      }
      
      const delegateCompensatorContract = await handleSetCompensatorContract(delegateCompensatorAddress);
      if (!delegateCompensatorContract) {
        throw new Error("Failed to get delegate's Compensator contract");
      }
      const { provider } = await getEthersSigner(wagmiConfig);
      const feeData = await provider.getFeeData();
      
      const gas = await delegateCompensatorContract.claimRewards.estimateGas();
      const claimReceipt = await delegateCompensatorContract.claimRewards({
        gasLimit: gas,
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
      });
      
      const transactionReceipt = await waitForTransactionReceipt(wagmiConfig, {
        hash: claimReceipt?.hash,
      });
      
      if (transactionReceipt?.status === "success") {
        setClaimSuccess(true);
        toast.success(`Successfully claimed ${pendingRewards} COMP tokens from delegations`, {
          style: {
            fontWeight: "600",
          },
        });
      }
      
    } catch (error) {
      console.error("Error claiming delegation rewards:", error)
      toast.error("Failed to claim delegation rewards", {
        style: {
          fontWeight: "600",
        },
      })
    } finally {
      setIsClaimLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast.success("Address copied to clipboard", {
        style: {
          fontWeight: "600",
        },
      })
    }
  }

  const formatAddress = (address?: string) => {
    if (!address) return "N/A"
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
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
    },
  }

  const togglePopover = () => {
    setShowPopover(!showPopover)
  }

  const toggleCompPopover = () => {
    setShowCompPopover(!showCompPopover)
  }

  const toggleEthereumExpanded = () => {
    setIsEthereumExpanded(!isEthereumExpanded)
  }

  const isClaimDisabled = Number.parseFloat(pendingRewards) <= 0 || isClaimLoading || claimSuccess

  if (!isClient) {
    return (
      <div className="w-[120px] h-[36px] bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
    )
  }

  if (!address) {
    if (isMobile) {
      return (
        <motion.button
          data-connect-wallet
          onClick={handleConnectWallet}
          variants={buttonVariants}
          initial="initial"
          whileHover="hover"
          whileTap="tap"
          disabled={isLoading}
          className="p-2 rounded-full bg-[#D8DFE5] dark:bg-[#1D2833] text-[#17212B] dark:text-white flex items-center justify-center w-10 h-10"
          aria-label="Connect Wallet"
        >
          <FaWallet className="h-4 w-4" />
        </motion.button>
      )
    }

    return (
      <motion.button
        data-connect-wallet
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


  if (isMobile) {
    return (
      <div className="relative">
        <motion.button
          ref={buttonRef}
          onClick={togglePopover}
          variants={buttonVariants}
          initial="initial"
          whileHover="hover"
          whileTap="tap"
          disabled={isLoading}
          className="p-2 rounded-full bg-[#D8DFE5] dark:bg-[#1D2833] text-[#17212B] dark:text-white flex items-center justify-center w-10 h-10"
          aria-label="Wallet Options"
        >
          <FaWallet className="h-5 w-5" />
        </motion.button>

        {showPopover && renderPopover()}
      </div>
    )
  }

  function renderPopover() {
    return createPortal(
      <motion.div
        ref={popoverRef}
        className="fixed font-medium mt-2 ml-[-227px] md:ml-[-207px] w-[320px] min-w-[310px] bg-white dark:bg-[#1D2833] rounded-xl shadow-lg z-50 border border-[#efefef] dark:border-[#28303E] overflow-hidden"
        variants={popoverVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
        style={{
          top: buttonRef.current?.getBoundingClientRect().bottom,
          left: buttonRef.current?.getBoundingClientRect().left,
          transformOrigin: "top right",
        }}
      >
        <div className="p-4">
          <h3 className="text-[#030303] dark:text-gray-400 font-semibold text-xs mb-3">Connected Wallet</h3>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1">
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
            onClick={handleFaucetClaim}
            className="w-full py-3 px-4 text-xs font-semibold bg-[#D7DFE4] dark:bg-[#2B3947] hover:bg-[#c7d1d6] dark:hover:bg-[#2F3E4D] text-[#030303] dark:text-white rounded-full transition-colors flex items-center justify-center"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={isFaucetLoading}
          >
            {isFaucetLoading ? (
              <svg
                className="animate-spin h-4 w-4"
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
              "Get Testnet Tokens"
            )}
          </motion.button>
        </div>
      </motion.div>,
      document.body,
    )
  }

  function renderCompPopover() {
    const [integerPart, decimalPart] = pendingRewards.split('.')
    
    return createPortal(
      <motion.div
        ref={compPopoverRef}
        className="fixed font-medium mt-5 ml-[-227px] md:ml-[-132px] w-[320px] min-w-[310px] bg-white dark:bg-[#1D2833] rounded-xl shadow-lg z-50 border border-[#efefef] dark:border-[#28303E] overflow-hidden"
        variants={popoverVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
        style={{
          top: compButtonRef.current?.getBoundingClientRect().bottom,
          left: compButtonRef.current?.getBoundingClientRect().left,
          transformOrigin: "top right",
        }}
      >
        <div className="p-4">
          <h3 className="text-[#030303] dark:text-gray-400 font-semibold text-xs mb-3">Total COMP</h3>
          <div className="flex items-center gap-2 mb-4">
            <Image src="/logo.png" alt="COMP Logo" width={24} height={24} className="rounded-full" />
            <span className="text-[#030303] dark:text-white text-2xl font-semibold">
              {integerPart}<span className="text-gray-400">.{decimalPart}</span>
            </span>
          </div>

          <div className="border-t border-[#efefef] dark:border-[#28303E] ml-8 mb-3"></div>

          <div className="px-1">
            <div className="flex items-center justify-between cursor-pointer" onClick={toggleEthereumExpanded}>
              <div className="flex items-center gap-2">
                <Image
                  src="/ethereum.svg"
                  alt="Ethereum Logo"
                  width={20}
                  height={20}
                  className="rounded-full dark:hidden"
                />
                <Image
                  src="/eth-dark.svg"
                  alt="Ethereum Logo"
                  width={20}
                  height={20}
                  className="rounded-full hidden dark:block"
                />
                <span className="text-[#030303] dark:text-white text-sm font-semibold">Ethereum</span>
              </div>
              <div className="flex items-center gap-2">
                <AnimatePresence>
                  {!isEthereumExpanded && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm font-semibold"
                    >
                      {integerPart}<span className="text-gray-400">.{decimalPart}</span>
                    </motion.span>
                  )}
                </AnimatePresence>
                {isEthereumExpanded ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </div>
            </div>

            <AnimatePresence>
              {isEthereumExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="mt-3 pl-7"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-500 dark:text-gray-400 text-sm font-semibold">Wallet Balance</span>
                    <span className="text-[#030303] dark:text-white text-sm font-semibold">
                      {walletBalance.split('.')[0]}<span className="text-gray-400">.{walletBalance.split('.')[1]}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-500 dark:text-gray-400 text-sm font-semibold">Unclaimed</span>
                    <span className="text-[#030303] dark:text-white text-sm font-semibold">
                      {integerPart}<span className="text-gray-400">.{decimalPart}</span>
                    </span>
                  </div>
                  <motion.button
                    onClick={handleClaimCOMP}
                    disabled={isClaimDisabled}
                    className={`
                      w-full py-3 px-4 text-xs font-semibold rounded-full transition-colors
                      ${
                        isClaimDisabled
                          ? "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                          : "bg-[#D7DFE4] dark:bg-[#2B3947] hover:bg-[#c7d1d6] dark:hover:bg-[#2F3E4D] text-[#030303] dark:text-white"
                      }
                    `}
                    whileHover={!isClaimDisabled ? { scale: 1.02 } : {}}
                    whileTap={!isClaimDisabled ? { scale: 0.98 } : {}}
                  >
                    {isClaimLoading ? (
                      <div className="flex items-center justify-center">
                        <svg
                          className="animate-spin h-4 w-4 mr-2"
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
                        Claiming...
                      </div>
                    ) : claimSuccess ? (
                      <div className="flex items-center justify-center">
                        <svg
                          className="h-4 w-4 mr-2 text-green-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Claimed Successfully
                      </div>
                    ) : (
                      `Claim ${pendingRewards} COMP`
                    )}
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>,
      document.body,
    )
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-[#F9FAFB] dark:bg-[#17212B] border border-[#efefef] dark:border-[#28303e] shadow-sm pl-3 rounded-full">
        {/* COMP Rewards Display */}
        <motion.button
          ref={compButtonRef}
          onClick={toggleCompPopover}
          variants={buttonVariants}
          initial="initial"
          whileHover="hover"
          whileTap="tap"
          className="flex items-center gap-2 cursor-pointer"
        >
          <Image src="/logo.png" alt="COMP Logo" width={20} height={20} className="mx-auto rounded-full" />
          <span className="text-[#030303] dark:text-white font-semibold text-xs">{pendingRewards}</span>
        </motion.button>

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
            flex items-center gap-2 transition-colors focus:outline-none
            border border-[#efefef] dark:border-[#28303e]
          `}
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#030303] dark:text-white text-xs">{formatAddress(address)}</span>
          </div>
        </motion.button>
      </div>

      {showPopover && renderPopover()}
      {showCompPopover && renderCompPopover()}
    </div>
  )
}

export default ConnectWalletButton
