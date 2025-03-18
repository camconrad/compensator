"use client"

import Head from "next/head"
import { motion, AnimatePresence } from "framer-motion"
import Header from "@/components/MainLayout/Header"
import Footer from "@/components/Footer"
import { useSettingTheme } from "@/store/setting/selector"
import Headroom from "react-headroom"
import { TrendingUp, Users, AlertCircle, Wallet } from "lucide-react"
import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"

// Types for our data
interface UserProfile {
  name: string
  address: string
  image: string
  bio: string
  votingPower: string
  totalDelegations: number
  activeDelegations: number
}

interface Delegation {
  delegate: string
  delegateImage: string
  amount: string
  date: string
}

interface Proposal {
  title: string
  status: string
  date: string
  votesFor: number
  votesAgainst: number
  voted: boolean
  voteDirection: "for" | "against" | null
}

export default function ProfilePage() {
  const theme = useSettingTheme()

  // State management
  const [isWalletConnected, setIsWalletConnected] = useState<boolean>(false)
  const [isError, setIsError] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string>("")

  // Data states with proper typing
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [delegations, setDelegations] = useState<Delegation[]>([])
  const [proposals, setProposals] = useState<Proposal[]>([])

  // Loading states for different sections
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(true)
  const [isDelegationsLoading, setIsDelegationsLoading] = useState<boolean>(true)
  const [isProposalsLoading, setIsProposalsLoading] = useState<boolean>(true)

  // Check wallet connection status
  useEffect(() => {
    // Simulate checking if wallet is connected
    const checkWalletConnection = async () => {
      // In a real app, this would check the wallet connection status
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setIsWalletConnected(false) // Set to false by default for demo
    }

    checkWalletConnection()
  }, [])

  // Fetch data if wallet is connected
  useEffect(() => {
    if (isWalletConnected) {
      fetchProfileData()
      fetchDelegations()
      fetchProposals()
    } else {
      // Reset loading states if wallet is not connected
      setIsProfileLoading(false)
      setIsDelegationsLoading(false)
      setIsProposalsLoading(false)
    }
  }, [isWalletConnected])

  // Simulate fetching profile data
  const fetchProfileData = async () => {
    setIsProfileLoading(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1200))

      // Mock data
      setProfile({
        name: "Your Name",
        address: "0x1234...5678",
        image: "/placeholder.svg?height=96&width=96",
        bio: "Compound governance participant since 2023.",
        votingPower: "0.05% of Quorum",
        totalDelegations: 2,
        activeDelegations: 1,
      })
      setIsProfileLoading(false)
    } catch (error) {
      setIsError(true)
      setErrorMessage("Failed to load profile data. Please try again.")
      setIsProfileLoading(false)
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
          delegate: "Geoffrey Hayes",
          delegateImage: "/delegates/geoffrey-hayes.jpg",
          amount: "500 COMP",
          date: "Feb 28th, 2025",
        },
        {
          delegate: "a16z",
          delegateImage: "/delegates/a16z.jpg",
          amount: "300 COMP",
          date: "Mar 5th, 2025",
        },
      ])
      setIsDelegationsLoading(false)
    } catch (error) {
      setIsError(true)
      setErrorMessage("Failed to load delegations. Please try again.")
      setIsDelegationsLoading(false)
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
          voted: true,
          voteDirection: "for",
        },
        {
          title: "Add tETH as collateral into cWETHv3 on Mainnet",
          status: "ACTIVE",
          date: "Mar 14th, 2025",
          votesFor: 703.99,
          votesAgainst: 0.29,
          voted: false,
          voteDirection: null,
        },
      ])
      setIsProposalsLoading(false)
    } catch (error) {
      setIsError(true)
      setErrorMessage("Failed to load proposals. Please try again.")
      setIsProposalsLoading(false)
    }
  }

  // Handle retry on error
  const handleRetry = () => {
    setIsError(false)
    setErrorMessage("")

    if (isWalletConnected) {
      if (isProfileLoading || !profile) fetchProfileData()
      if (isDelegationsLoading || delegations.length === 0) fetchDelegations()
      if (isProposalsLoading || proposals.length === 0) fetchProposals()
    }
  }

  return (
    <>
      <Head>
        <title>My Profile | Compensator</title>
        <meta name="description" content="View your Compound governance profile and delegations" />
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

          <div className="mx-auto max-w-[1100px] w-full p-4 mt-[-120px]">

            {!isWalletConnected ? (
              // Single disconnected wallet section
              <motion.div
                className="mb-8 bg-white dark:bg-[#1D2833] p-6 rounded-lg"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="p-3 bg-[#EFF2F5] dark:bg-[#293846] rounded-full mb-3">
                    <Wallet className="h-6 w-6 text-[#6D7C8D] dark:text-gray-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-[#030303] dark:text-white mb-[2px]">Disconnected</h2>
                  <p className="text-[#6D7C8D] font-medium dark:text-gray-400 mb-4 max-w-md">
                    Connect a web3 wallet to view your profile
                  </p>
                  <Link
                    href="/explore"
                    className="bg-[#EFF2F5] transition-all duration-200 transform hover:scale-105 active:scale-9 dark:bg-white text-[#0D131A] px-6 py-2 rounded-full hover:bg-emerald-600 hover:text-white dark:hover:text-[#0D131A] font-semibold text-sm"
                  >
                    Explore Delegates
                  </Link>
                </div>
              </motion.div>
            ) : (
              // Connected wallet sections
              <>
                {/* Profile Section */}
                <motion.div
                  className="mb-8 bg-white dark:bg-[#1D2833] p-6 rounded-lg shadow-sm"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {isProfileLoading ? (
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                      <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-[#33475b] animate-pulse"></div>
                      <div className="flex-1">
                        <div className="h-8 w-48 bg-gray-200 dark:bg-[#33475b] rounded-md animate-pulse mb-2"></div>
                        <div className="h-4 w-32 bg-gray-200 dark:bg-[#33475b] rounded-md animate-pulse mb-3"></div>
                        <div className="h-4 w-full bg-gray-200 dark:bg-[#33475b] rounded-md animate-pulse mb-2"></div>
                        <div className="h-4 w-3/4 bg-gray-200 dark:bg-[#33475b] rounded-md animate-pulse mb-4"></div>
                        <div className="flex flex-wrap gap-4">
                          <div className="h-5 w-32 bg-gray-200 dark:bg-[#33475b] rounded-md animate-pulse"></div>
                          <div className="h-5 w-36 bg-gray-200 dark:bg-[#33475b] rounded-md animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  ) : profile ? (
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                      <div className="w-24 h-24 rounded-full overflow-hidden">
                        <Image
                          src={profile.image || "/placeholder.svg"}
                          alt="Your Profile"
                          width={96}
                          height={96}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h2 className="text-2xl font-bold text-[#030303] dark:text-white">{profile.name}</h2>
                        <p className="text-sm text-[#6D7C8D] dark:text-gray-400">{profile.address}</p>
                        <p className="text-sm text-[#6D7C8D] dark:text-gray-400 mt-3">{profile.bio}</p>
                        <div className="flex flex-wrap items-center gap-4 mt-4">
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-4 h-4 text-blue-500" />
                            <span className="text-sm text-[#6D7C8D] dark:text-gray-400">{profile.votingPower}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4 text-emerald-500" />
                            <span className="text-sm text-[#6D7C8D] dark:text-gray-400">
                              {profile.activeDelegations} Active Delegations
                            </span>
                          </div>
                        </div>
                      </div>
                      <Link
                        href="/explore"
                        className="bg-[#EFF2F5] transition-all duration-200 transform hover:scale-105 active:scale-9 dark:bg-white text-[#0D131A] px-6 py-2 rounded-full hover:bg-emerald-600 hover:text-white dark:hover:text-white font-semibold"
                      >
                        Find Delegates
                      </Link>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center p-8">
                      <p className="text-[#6D7C8D] dark:text-gray-400">No profile data available</p>
                    </div>
                  )}
                </motion.div>

                {/* My Delegations Section */}
                <motion.div
                  className="mb-8"
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                >
                  <h2 className="text-xl font-semibold text-[#030303] dark:text-white mb-3">My Delegations</h2>

                  {isDelegationsLoading ? (
                    <div className="space-y-4">
                      {[1, 2].map((_, index) => (
                        <div key={index} className="p-4 bg-white dark:bg-[#1D2833] rounded-lg shadow-sm animate-pulse">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 bg-gray-200 dark:bg-[#33475b] rounded-full"></div>
                            <div>
                              <div className="h-5 w-40 bg-gray-200 dark:bg-[#33475b] rounded-md mb-2"></div>
                              <div className="h-4 w-32 bg-gray-200 dark:bg-[#33475b] rounded-md"></div>
                            </div>
                            <div className="ml-auto h-4 w-20 bg-gray-200 dark:bg-[#33475b] rounded-md"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : delegations.length > 0 ? (
                    <div className="space-y-4">
                      {delegations.map((delegation, index) => (
                        <motion.div
                          key={index}
                          className="p-4 bg-white dark:bg-[#1D2833] rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: 0.1 + index * 0.05 }}
                          whileHover={{ y: -2 }}
                          onClick={() =>
                            (window.location.href = `/delegate/${delegation.delegate.toLowerCase().replace(/\s+/g, "-")}`)
                          }
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative h-12 w-12 flex-shrink-0">
                              <Image
                                src={delegation.delegateImage || "/placeholder.svg?height=48&width=48"}
                                alt={delegation.delegate}
                                width={48}
                                height={48}
                                className="object-cover rounded-full"
                              />
                            </div>
                            <div>
                              <p className="text-base font-semibold text-[#030303] dark:text-white">
                                {delegation.delegate}
                              </p>
                              <p className="text-sm text-[#6D7C8D] dark:text-gray-400">Amount: {delegation.amount}</p>
                            </div>
                            <p className="ml-auto text-xs text-[#6D7C8D] dark:text-gray-400">{delegation.date}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-[#1D2833] rounded-lg shadow-sm p-8 text-center">
                      <Users className="h-12 w-12 text-[#6D7C8D] dark:text-gray-400 mx-auto mb-4" />
                      <h2 className="text-xl font-semibold text-[#030303] dark:text-white mb-2">No Delegations Yet</h2>
                      <p className="text-[#6D7C8D] dark:text-gray-400 mb-6 max-w-md mx-auto">
                        You haven't delegated to anyone yet. Find delegates to support on the explore page.
                      </p>
                      <Link
                        href="/explore"
                        className="bg-[#EFF2F5] transition-all duration-200 transform hover:scale-105 active:scale-9 dark:bg-white text-[#0D131A] px-6 py-2 rounded-full hover:bg-emerald-600 hover:text-white dark:hover:text-white font-semibold"
                      >
                        Find Delegates
                      </Link>
                    </div>
                  )}
                </motion.div>

                {/* My Voting History Section */}
                <motion.div
                  className="mb-8"
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.2, delay: 0.2 }}
                >
                  <h2 className="text-xl font-semibold text-[#030303] dark:text-white mb-3">My Voting History</h2>

                  {isProposalsLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[1, 2].map((_, index) => (
                        <div key={index} className="p-4 bg-white dark:bg-[#1D2833] rounded-lg shadow-sm animate-pulse">
                          <div className="h-6 w-3/4 bg-gray-200 dark:bg-[#33475b] rounded-md mb-3"></div>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="h-5 w-16 bg-gray-200 dark:bg-[#33475b] rounded-full"></div>
                            <div className="h-4 w-24 bg-gray-200 dark:bg-[#33475b] rounded-md"></div>
                          </div>
                          <div className="h-4 w-full bg-gray-200 dark:bg-[#33475b] rounded-md mb-2"></div>
                          <div className="h-2 w-full bg-gray-200 dark:bg-[#33475b] rounded-full mb-2"></div>
                          <div className="flex justify-between">
                            <div className="h-4 w-20 bg-gray-200 dark:bg-[#33475b] rounded-md"></div>
                            <div className="h-4 w-20 bg-gray-200 dark:bg-[#33475b] rounded-md"></div>
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
                          transition={{ duration: 0.2, delay: 0.2 + index * 0.05 }}
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
                            <div className="w-full bg-gray-200 dark:bg-[#33475b] rounded-full h-1.5">
                              <div
                                className="bg-emerald-500 h-1.5 rounded-full"
                                style={{
                                  width: `${(proposal.votesFor / (proposal.votesFor + proposal.votesAgainst)) * 100}%`,
                                }}
                              ></div>
                            </div>
                            <div className="flex justify-between mt-2">
                              <p className="text-sm text-green-600 dark:text-green-400">For: {proposal.votesFor}K</p>
                              <p className="text-sm text-red-600 dark:text-red-400">
                                Against: {proposal.votesAgainst}K
                              </p>
                            </div>
                          </div>
                          {proposal.voted && (
                            <div className="mt-3 flex items-center">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  proposal.voteDirection === "for"
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                }`}
                              >
                                You voted {proposal.voteDirection === "for" ? "For" : "Against"}
                              </span>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-[#1D2833] rounded-lg shadow-sm p-8 text-center">
                      <TrendingUp className="h-12 w-12 text-[#6D7C8D] dark:text-gray-400 mx-auto mb-4" />
                      <h2 className="text-xl font-semibold text-[#030303] dark:text-white mb-2">No Voting History</h2>
                      <p className="text-[#6D7C8D] dark:text-gray-400 mb-6 max-w-md mx-auto">
                        You haven't voted on any proposals yet. Active proposals will appear here once you've voted.
                      </p>
                      <Link
                        href="/proposals"
                        className="bg-[#EFF2F5] transition-all duration-200 transform hover:scale-105 active:scale-9 dark:bg-white text-[#0D131A] px-6 py-2 rounded-full hover:bg-emerald-600 hover:text-white dark:hover:text-white font-semibold"
                      >
                        View Active Proposals
                      </Link>
                    </div>
                  )}
                </motion.div>
              </>
            )}
          </div>
        </motion.main>
        <Footer />
      </div>
    </>
  )
}

