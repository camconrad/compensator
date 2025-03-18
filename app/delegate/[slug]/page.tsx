"use client"

import Head from "next/head"
import { motion, AnimatePresence } from "framer-motion"
import Header from "@/components/MainLayout/Header"
import Footer from "@/components/Footer"
import { useSettingTheme } from "@/store/setting/selector"
import Headroom from "react-headroom"
import { Star, TrendingUp, Users, ArrowLeft, AlertCircle } from "lucide-react"
import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useParams } from "next/navigation"

// Types for our data
interface Delegate {
  name: string
  address: string
  image: string
  bio: string
  status: string
  votingPower: string
  totalDelegations: number
  activeProposals: number
  rating: number
}

interface Proposal {
  title: string
  status: string
  date: string
  votesFor: number
  votesAgainst: number
}

interface Delegation {
  delegator: string
  amount: string
  date: string
}

export default function DelegatePage() {
  const theme = useSettingTheme()
  const params = useParams()
  const delegateSlug = params.slug as string

  // State management
  const [isError, setIsError] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string>("")

  // Data states with proper typing
  const [delegate, setDelegate] = useState<Delegate | null>(null)
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [delegations, setDelegations] = useState<Delegation[]>([])

  // Loading states for different sections
  const [isDelegateLoading, setIsDelegateLoading] = useState<boolean>(true)
  const [isProposalsLoading, setIsProposalsLoading] = useState<boolean>(true)
  const [isDelegationsLoading, setIsDelegationsLoading] = useState<boolean>(true)

  // Mock data fetching - in a real app, this would fetch data for the specific delegate
  useEffect(() => {
    fetchDelegateData()
    fetchProposals()
    fetchDelegations()
  }, [delegateSlug])

  // Simulate fetching delegate data
  const fetchDelegateData = async () => {
    setIsDelegateLoading(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1200))

      // Mock data - in a real app, this would use the delegateSlug to fetch the specific delegate
      setDelegate({
        name: delegateSlug
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" "),
        address: "0x5898...4848",
        image: "/delegates/geoffrey-hayes.jpg",
        bio: "Experienced Compound delegate with a focus on sustainable growth and community-driven governance.",
        status: "Active",
        votingPower: "12.35% of Quorum",
        totalDelegations: 24,
        activeProposals: 3,
        rating: 4.7,
      })
      setIsDelegateLoading(false)
    } catch (error) {
      setIsError(true)
      setErrorMessage("Failed to load delegate data. Please try again.")
      setIsDelegateLoading(false)
    }
  }

  // Simulate fetching proposals
  const fetchProposals = async () => {
    setIsProposalsLoading(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1800))

      // Mock data
      setProposals([
        {
          title: "Add wasperOETHb as collateral into cWETHv3 on Base",
          status: "ACTIVE",
          date: "Mar 14th, 2025",
          votesFor: 573.63,
          votesAgainst: 0.04,
        },
        {
          title: "Add tETH as collateral into cWETHv3 on Mainnet",
          status: "ACTIVE",
          date: "Mar 14th, 2025",
          votesFor: 703.99,
          votesAgainst: 0.29,
        },
        {
          title: "[Gauntlet] – Rewards Top Up for Ethereum, Base and Optimism",
          status: "PENDING EXECUTION",
          date: "Mar 10th, 2025",
          votesFor: 684,
          votesAgainst: 517.09,
        },
      ])
      setIsProposalsLoading(false)
    } catch (error) {
      setIsError(true)
      setErrorMessage("Failed to load proposals. Please try again.")
      setIsProposalsLoading(false)
    }
  }

  // Simulate fetching delegations
  const fetchDelegations = async () => {
    setIsDelegationsLoading(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Mock data
      setDelegations([
        {
          delegator: "0x1234...5678",
          amount: "500 COMP",
          date: "Feb 28th, 2025",
        },
        {
          delegator: "0x5678...1234",
          amount: "300 COMP",
          date: "Mar 5th, 2025",
        },
        {
          delegator: "0xabcd...ef01",
          amount: "750 COMP",
          date: "Mar 12th, 2025",
        },
      ])
      setIsDelegationsLoading(false)
    } catch (error) {
      setIsError(true)
      setErrorMessage("Failed to load delegations. Please try again.")
      setIsDelegationsLoading(false)
    }
  }

  // Handle retry on error
  const handleRetry = () => {
    setIsError(false)
    setErrorMessage("")

    if (isDelegateLoading || !delegate) fetchDelegateData()
    if (isProposalsLoading || proposals.length === 0) fetchProposals()
    if (isDelegationsLoading || delegations.length === 0) fetchDelegations()
  }

  return (
    <>
      <Head>
        <title>{delegate ? delegate.name : "Loading Delegate"} | Compensator</title>
        <meta
          name="description"
          content={
            delegate
              ? `Profile page for ${delegate.name}, a Compound delegate on the Compensator marketplace.`
              : "Loading delegate profile..."
          }
        />
      </Head>

      <div className="min-h-screen bg-[#EFF2F5] dark:bg-[#0D131A]">
        <div className="relative z-50">
          <Headroom
            style={{
              overflowX: "hidden",
            }}
          >
            <Header />
          </Headroom>
        </div>

        <motion.main
          className="flex flex-col items-center justify-center min-h-screen"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          {/* Error Message */}
          <AnimatePresence>
            {isError && (
              <motion.div
                className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg shadow-md flex items-center"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                <AlertCircle className="h-5 w-5 mr-2" />
                <span>{errorMessage}</span>
                <button
                  onClick={handleRetry}
                  className="ml-4 text-sm font-medium underline hover:text-red-800 dark:hover:text-red-300"
                >
                  Retry
                </button>
                <button
                  onClick={() => setIsError(false)}
                  className="ml-2 text-sm font-medium hover:text-red-800 dark:hover:text-red-300"
                >
                  ✕
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mx-auto max-w-[1100px] w-full p-4 mt-4">

            {/* Delegate Profile Section */}
            <motion.div
              className="mb-8 bg-white dark:bg-[#1D2833] p-6 rounded-lg shadow-sm"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {isDelegateLoading ? (
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-[#2c2c2c] animate-pulse"></div>
                  <div className="flex-1">
                    <div className="h-8 w-48 bg-gray-200 dark:bg-[#2c2c2c] rounded-md animate-pulse mb-2"></div>
                    <div className="h-4 w-32 bg-gray-200 dark:bg-[#2c2c2c] rounded-md animate-pulse mb-3"></div>
                    <div className="h-6 w-20 bg-gray-200 dark:bg-[#2c2c2c] rounded-full animate-pulse mb-3"></div>
                    <div className="h-4 w-full bg-gray-200 dark:bg-[#2c2c2c] rounded-md animate-pulse mb-2"></div>
                    <div className="h-4 w-3/4 bg-gray-200 dark:bg-[#2c2c2c] rounded-md animate-pulse mb-4"></div>
                    <div className="flex flex-wrap gap-4">
                      <div className="h-5 w-20 bg-gray-200 dark:bg-[#2c2c2c] rounded-md animate-pulse"></div>
                      <div className="h-5 w-32 bg-gray-200 dark:bg-[#2c2c2c] rounded-md animate-pulse"></div>
                      <div className="h-5 w-36 bg-gray-200 dark:bg-[#2c2c2c] rounded-md animate-pulse"></div>
                    </div>
                  </div>
                  <div className="h-10 w-32 bg-gray-200 dark:bg-[#2c2c2c] rounded-full animate-pulse"></div>
                </div>
              ) : delegate ? (
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                  <div className="w-24 h-24 rounded-full overflow-hidden">
                    <Image
                      src={delegate.image || "/placeholder.svg?height=96&width=96"}
                      alt={delegate.name}
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-[#030303] dark:text-white">{delegate.name}</h1>
                    <p className="text-sm text-[#6D7C8D] dark:text-gray-400">{delegate.address}</p>
                    <div className="inline-flex items-center px-2 py-1 mt-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-medium">
                      {delegate.status}
                    </div>
                    <p className="text-sm text-[#6D7C8D] dark:text-gray-400 mt-3">{delegate.bio}</p>
                    <div className="flex flex-wrap items-center gap-4 mt-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm text-[#6D7C8D] dark:text-gray-400">{delegate.rating}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4 text-blue-500" />
                        <span className="text-sm text-[#6D7C8D] dark:text-gray-400">
                          {delegate.totalDelegations} Delegations
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span className="text-sm text-[#6D7C8D] dark:text-gray-400">
                          {delegate.activeProposals} Active Proposals
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button className="bg-[#10b981] text-white px-6 py-2 rounded-full hover:bg-emerald-600 transition-colors font-semibold">
                    Delegate COMP
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-center p-8">
                  <p className="text-[#6D7C8D] dark:text-gray-400">No delegate data available</p>
                </div>
              )}
            </motion.div>

            {/* Proposals Section */}
            <motion.div
              className="mb-8"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.2, delay: 0.1 }}
            >
              <h2 className="text-2xl font-bold text-[#030303] dark:text-white mb-6">Proposals</h2>

              {isProposalsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[1, 2, 3].map((_, index) => (
                    <div key={index} className="p-4 bg-white dark:bg-[#1D2833] rounded-lg shadow-sm animate-pulse">
                      <div className="h-6 w-3/4 bg-gray-200 dark:bg-[#2c2c2c] rounded-md mb-3"></div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-5 w-16 bg-gray-200 dark:bg-[#2c2c2c] rounded-full"></div>
                        <div className="h-4 w-24 bg-gray-200 dark:bg-[#2c2c2c] rounded-md"></div>
                      </div>
                      <div className="h-4 w-full bg-gray-200 dark:bg-[#2c2c2c] rounded-md mb-2"></div>
                      <div className="h-2 w-full bg-gray-200 dark:bg-[#2c2c2c] rounded-full mb-2"></div>
                      <div className="flex justify-between">
                        <div className="h-4 w-20 bg-gray-200 dark:bg-[#2c2c2c] rounded-md"></div>
                        <div className="h-4 w-20 bg-gray-200 dark:bg-[#2c2c2c] rounded-md"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : proposals.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {proposals.map((proposal, index) => (
                    <motion.div
                      key={index}
                      className="p-4 bg-white dark:bg-[#1D2833] rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: 0.1 + index * 0.05 }}
                      whileHover={{ y: -2 }}
                    >
                      <h3 className="text-lg font-semibold text-[#030303] dark:text-white">{proposal.title}</h3>
                      <div className="flex items-center mt-2">
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            proposal.status === "ACTIVE"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                          }`}
                        >
                          {proposal.status}
                        </span>
                        <span className="text-sm text-[#6D7C8D] dark:text-gray-400 ml-2">{proposal.date}</span>
                      </div>
                      <div className="mt-3">
                        <div className="flex justify-between mb-1">
                          <p className="text-sm text-[#6D7C8D] dark:text-gray-400">Votes</p>
                          <p className="text-sm text-[#6D7C8D] dark:text-gray-400">
                            {(proposal.votesFor + proposal.votesAgainst).toFixed(2)}K
                          </p>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-[#2c2c2c] rounded-full h-1.5">
                          <div
                            className="bg-emerald-500 h-1.5 rounded-full"
                            style={{
                              width: `${(proposal.votesFor / (proposal.votesFor + proposal.votesAgainst)) * 100}%`,
                            }}
                          ></div>
                        </div>
                        <div className="flex justify-between mt-2">
                          <p className="text-sm text-green-600 dark:text-green-400">For: {proposal.votesFor}K</p>
                          <p className="text-sm text-red-600 dark:text-red-400">Against: {proposal.votesAgainst}K</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="bg-white dark:bg-[#1D2833] rounded-lg shadow-sm p-8 text-center">
                  <p className="text-[#6D7C8D] dark:text-gray-400">No proposals available</p>
                </div>
              )}
            </motion.div>

            {/* Delegations Section */}
            <motion.div
              className="mb-8"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.2, delay: 0.2 }}
            >
              <h2 className="text-2xl font-bold text-[#030303] dark:text-white mb-6">Received Delegations</h2>

              {isDelegationsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((_, index) => (
                    <div key={index} className="p-4 bg-white dark:bg-[#1D2833] rounded-lg shadow-sm animate-pulse">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="h-5 w-40 bg-gray-200 dark:bg-[#2c2c2c] rounded-md mb-2"></div>
                          <div className="h-4 w-32 bg-gray-200 dark:bg-[#2c2c2c] rounded-md"></div>
                        </div>
                        <div className="h-4 w-20 bg-gray-200 dark:bg-[#2c2c2c] rounded-md"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : delegations.length > 0 ? (
                <div className="space-y-4">
                  {delegations.map((delegation, index) => (
                    <motion.div
                      key={index}
                      className="p-4 bg-white dark:bg-[#1D2833] rounded-lg shadow-sm"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: 0.2 + index * 0.05 }}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-semibold text-[#030303] dark:text-white">
                            Delegator: {delegation.delegator}
                          </p>
                          <p className="text-sm text-[#6D7C8D] dark:text-gray-400">Amount: {delegation.amount}</p>
                        </div>
                        <p className="text-xs text-[#6D7C8D] dark:text-gray-400">{delegation.date}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="bg-white dark:bg-[#1D2833] rounded-lg shadow-sm p-8 text-center">
                  <p className="text-[#6D7C8D] dark:text-gray-400">No delegations available</p>
                </div>
              )}
            </motion.div>
          </div>
        </motion.main>
        <Footer />
      </div>
    </>
  )
}
