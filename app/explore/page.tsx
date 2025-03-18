"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import Head from "next/head"
import Image from "next/image"
import {
  TrendingUp,
  TrendingDown,
  Users,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  ChevronsUpDown,
  X,
} from "lucide-react"
import toast from "react-hot-toast"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import Header from "@/components/MainLayout/Header"
import Footer from "@/components/Footer"
import { useSettingTheme } from "@/store/setting/selector"
import Headroom from "react-headroom"

// Utility function to format the name for URLs
const formatNameForURL = (name: string) => {
  return name
    .toLowerCase() // Convert to lowercase
    .replace(/\s+/g, "-") // Replace spaces with dashes
    .replace(/[^a-z0-9-]/g, "") // Remove any non-alphanumeric characters except dashes
}

// Featured Delegates Data
interface Delegate {
  id: number
  name: string
  address: string
  image: string
  rewardAPR: string
  votingPower?: number
  activeProposals?: number
  totalDelegations?: number
  performance7D?: number
}

const delegatesData: Delegate[] = [
  {
    id: 1,
    name: "a16z",
    address: "0x123..4567",
    image: "/delegates/a16z.jpg",
    rewardAPR: "0.00%",
  },
  {
    id: 2,
    name: "Gauntlet",
    address: "0x123..4567",
    image: "/delegates/gauntlet.png",
    rewardAPR: "0.00%",
  },
  {
    id: 3,
    name: "Geoffrey Hayes",
    address: "0x123..4567",
    image: "/delegates/geoffrey-hayes.jpg",
    rewardAPR: "0.00%",
  },
  {
    id: 4,
    name: "Tennis Bowling",
    address: "0x123..4567",
    image: "/delegates/tennis-bowling.jpg",
    rewardAPR: "0.00%",
  },
  {
    id: 5,
    name: "Monet Supply",
    address: "0x123..4567",
    image: "/delegates/monet-supply.jpg",
    rewardAPR: "0.00%",
  },
  {
    id: 6,
    name: "allthecolors",
    address: "0x123..4567",
    image: "/delegates/all-the-colors.jpg",
    rewardAPR: "0.00%",
  },
]

// Mock Data Fetching Function
const fetchDelegates = async () => {
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
  await delay(1500) // Simulate network delay

  // Use the same delegate data but add additional properties for the table
  return delegatesData.map((delegate, index) => ({
    ...delegate,
    votingPower: Math.floor(Math.random() * 100),
    activeProposals: Math.floor(Math.random() * 10),
    totalDelegations: Math.floor(Math.random() * 100),
    performance7D: Math.random() * 20 - 10, // Random -10% to +10%
    imageUrl: delegate.image,
    tags: ["Active", "Verified"].slice(0, Math.floor(Math.random() * 2) + 1),
  }))
}

const handleCopyClick = (e: React.MouseEvent, address: string) => {
  e.preventDefault() // Prevent the Link navigation
  e.stopPropagation() // Prevent event bubbling
  navigator.clipboard
    .writeText(address)
    .then(() => {
      toast.success("Address copied", {
        position: "bottom-center",
        style: {
          borderRadius: "10px",
          background: "#333",
          color: "#fff",
        },
        iconTheme: {
          primary: "#10B981",
          secondary: "#FFFFFF",
        },
      })
    })
    .catch(() => {
      toast.error("Failed to copy address.", {
        position: "bottom-center",
        style: {
          borderRadius: "10px",
          background: "#333",
          color: "#fff",
        },
      })
    })
}

const ExplorePage = () => {
  const theme = useSettingTheme()
  const [tableData, setTableData] = useState<any[]>([])
  const [filteredDelegates, setFilteredDelegates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadDelegates = async () => {
      setLoading(true)
      const delegates = await fetchDelegates()
      setTableData(delegates)
      setFilteredDelegates(delegates)
      setLoading(false)
    }
    loadDelegates()
  }, [])

  useEffect(() => {
    // Filter delegates based on search query and active tab
    let filtered = tableData

    if (searchQuery) {
      filtered = filtered.filter(
        (delegate) =>
          delegate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          delegate.address.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    if (activeTab === "positive") {
      filtered = filtered.filter((delegate) => delegate.performance7D >= 0)
    } else if (activeTab === "negative") {
      filtered = filtered.filter((delegate) => delegate.performance7D < 0)
    }

    setFilteredDelegates(filtered)
  }, [searchQuery, activeTab, tableData])

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const toggleFilter = () => {
    setIsFilterOpen(!isFilterOpen)
  }

  const handleFilterSelect = (filter: string) => {
    setActiveTab(filter)
    setIsFilterOpen(false)
  }

  return (
    <>
      <Head>
        <title>Explore Delegates | Compensator</title>
        <meta name="description" content="Explore and discover delegates on the Compound delegate marketplace." />
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-[1100px] mx-auto p-4"
        >
          {/* Table Section with View All Delegates title and filter dropdown */}
          <section>
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-[#030303] dark:text-white mb-1">View All Delegates</h2>
              <div className="relative mb-3" ref={filterRef}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleFilter}
                  className={`p-2 rounded-full bg-white dark:bg-[#1D2833] border-gray-200 dark:border-[#232F3B] ${
                    isFilterOpen ? "bg-[#EFF2F5] dark:bg-[#2d3d4d]" : ""
                  }`}
                >
                  <Filter className="mt-[2px] h-4 w-4" />
                </Button>

                <AnimatePresence>
                  {isFilterOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#1D2833] rounded-lg shadow-lg border border-gray-200 dark:border-[#232F3B] z-10"
                    >
                      <div className="p-2 border-b border-gray-200 dark:border-[#232F3B] flex justify-between items-center">
                        <span className="text-sm font-medium text-[#030303] dark:text-white">Filter Delegates</span>
                        <button
                          onClick={() => setIsFilterOpen(false)}
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="p-2">
                        <button
                          onClick={() => handleFilterSelect("all")}
                          className={`w-full text-left px-4 py-2 text-sm rounded-md transition-colors ${
                            activeTab === "all"
                              ? "bg-[#EFF2F5] dark:bg-[#2d3d4d] text-[#030303] dark:text-white"
                              : "text-[#6D7C8D] dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#232F3B]"
                          }`}
                        >
                          All Delegates
                        </button>
                        <button
                          onClick={() => handleFilterSelect("positive")}
                          className={`w-full text-left px-4 py-2 text-sm rounded-md transition-colors ${
                            activeTab === "positive"
                              ? "bg-[#EFF2F5] dark:bg-[#2d3d4d] text-[#030303] dark:text-white"
                              : "text-[#6D7C8D] dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#232F3B]"
                          }`}
                        >
                          Positive Performance
                        </button>
                        <button
                          onClick={() => handleFilterSelect("negative")}
                          className={`w-full text-left px-4 py-2 text-sm rounded-md transition-colors ${
                            activeTab === "negative"
                              ? "bg-[#EFF2F5] dark:bg-[#2d3d4d] text-[#030303] dark:text-white"
                              : "text-[#6D7C8D] dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#232F3B]"
                          }`}
                        >
                          Negative Performance
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-md border border-[#efefef] dark:border-[#232F3B] overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full mx-auto" role="table">
                  <thead className="bg-[#F9FAFB] dark:bg-[#1D2833]" role="rowgroup">
                    <tr role="row">
                      <th
                        scope="col"
                        className="px-6 py-3 text-sm font-semibold text-left text-[#030303] dark:text-white"
                      >
                        <div className="flex items-center gap-1">
                          Rank
                          <ChevronsUpDown className="h-4 w-4 text-[#6D7C8D]" />
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-sm font-semibold text-left text-[#030303] dark:text-white"
                      >
                        <div className="flex items-center gap-1">
                          Delegate
                          <ChevronsUpDown className="h-4 w-4 text-[#6D7C8D]" />
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-sm font-semibold text-left text-[#030303] dark:text-white"
                      >
                        <div className="flex items-center gap-1">
                          Voting Power
                          <ChevronsUpDown className="h-4 w-4 text-[#6D7C8D]" />
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-sm font-semibold text-left text-[#030303] dark:text-white"
                      >
                        <div className="flex items-center gap-1">
                          Active Proposals
                          <ChevronsUpDown className="h-4 w-4 text-[#6D7C8D]" />
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-sm font-semibold text-left text-[#030303] dark:text-white"
                      >
                        <div className="flex items-center gap-1">
                          Total Delegations
                          <ChevronsUpDown className="h-4 w-4 text-[#6D7C8D]" />
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-sm font-semibold text-left text-[#030303] dark:text-white"
                      >
                        <div className="flex items-center gap-1">
                          7D Performance
                          <ChevronsUpDown className="h-4 w-4 text-[#6D7C8D]" />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? Array.from({ length: 10 }).map((_, index) => (
                          <tr key={index} className="border-b dark:border-b-[#232F3B] border-b-[#efefef]">
                            <td className="px-6 py-4 animate-pulse">
                              <div className="w-5 h-5 bg-gray-300 dark:bg-[#2c2c2c] rounded-full"></div>
                            </td>
                            <td className="px-6 py-4 animate-pulse">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gray-300 dark:bg-[#2c2c2c] rounded-full"></div>
                                <div className="w-24 h-4 bg-gray-300 dark:bg-[#2c2c2c] rounded-md"></div>
                              </div>
                            </td>
                            <td className="px-6 py-4 animate-pulse">
                              <div className="w-12 h-4 bg-gray-300 dark:bg-[#2c2c2c] rounded-md"></div>
                            </td>
                            <td className="px-6 py-4 animate-pulse">
                              <div className="w-16 h-4 bg-gray-300 dark:bg-[#2c2c2c] rounded-md"></div>
                            </td>
                            <td className="px-6 py-4 animate-pulse">
                              <div className="w-12 h-4 bg-gray-300 dark:bg-[#2c2c2c] rounded-md"></div>
                            </td>
                            <td className="px-6 py-4 animate-pulse">
                              <div className="w-10 h-4 bg-gray-300 dark:bg-[#2c2c2c] rounded-md"></div>
                            </td>
                          </tr>
                        ))
                      : filteredDelegates.map((delegate, index) => (
                          <motion.tr
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            key={delegate.id}
                            className="border-b dark:border-b-[#232F3B] border-b-[#efefef] cursor-pointer hover:bg-[#f9f9f9] dark:hover:bg-[#24313d] transition-colors duration-150"
                            onClick={() => {
                              window.location.href = `/delegate/${formatNameForURL(delegate.name)}`
                            }}
                          >
                            <td className="px-6 text-[#030303] py-4 dark:text-gray-300 text-sm">#{index + 1}</td>
                            <td className="flex items-center py-3 gap-3 px-6">
                              <div className="relative overflow-hidden rounded-full w-[36px] h-[36px]">
                                <Image
                                  src={delegate.image || "/placeholder.svg"}
                                  alt={delegate.name}
                                  width={36}
                                  height={36}
                                  className="object-cover rounded-full"
                                />
                              </div>
                              <div>
                                <span className="text-[#030303] text-sm font-semibold truncate dark:text-gray-300 block mb-[-3px]">
                                  {delegate.name}
                                </span>
                                <span className="text-xs text-[#6D7C8D] dark:text-gray-400">{delegate.address}</span>
                              </div>
                            </td>
                            <td className="px-6 text-[#030303] text-sm py-4 dark:text-gray-300">
                              <div className="flex items-center">
                                <div className="w-16 bg-gray-200 dark:bg-[#2c2c2c] rounded-full h-1.5 mr-2">
                                  <div
                                    className="bg-emerald-500 h-1.5 rounded-full"
                                    style={{ width: `${delegate.votingPower}%` }}
                                  ></div>
                                </div>
                                <span>{delegate.votingPower}%</span>
                              </div>
                            </td>
                            <td className="px-6 text-[#030303] text-sm py-4 dark:text-gray-300">
                              {delegate.activeProposals}
                            </td>
                            <td className="px-6 text-[#030303] text-sm py-4 dark:text-gray-300">
                              <div className="flex items-center">
                                <Users className="h-3.5 w-3.5 mr-1.5 text-[#6D7C8D] dark:text-gray-400" />
                                {delegate.totalDelegations}
                              </div>
                            </td>
                            <td
                              className={`px-6 py-4 text-sm ${delegate.performance7D >= 0 ? "text-green-500" : "text-red-500"}`}
                            >
                              <div className="flex items-center">
                                {delegate.performance7D >= 0 ? (
                                  <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                                ) : (
                                  <TrendingDown className="h-3.5 w-3.5 mr-1.5" />
                                )}
                                {delegate.performance7D.toFixed(2)}%
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* Pagination */}
            {!loading && filteredDelegates.length > 0 && (
              <div className="flex justify-center mt-6">
                <div className="flex items-center space-x-[6px]">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className="bg-white dark:bg-[#1D2833] border-gray-200 dark:border-[#232F3B]"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="px-3 py-1 bg-[#10b981] text-white hover:bg-emerald-600 hover:text-white"
                  >
                    1
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="px-3 py-1 bg-white dark:bg-[#1D2833] border-gray-200 dark:border-[#232F3B]"
                  >
                    2
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="px-3 py-1 bg-white dark:bg-[#1D2833] border-gray-200 dark:border-[#232F3B]"
                  >
                    3
                  </Button>
                  <span className="text-[#6D7C8D]">...</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white dark:bg-[#1D2833] border-gray-200 dark:border-[#232F3B]"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* No Results */}
            {!loading && filteredDelegates.length === 0 && (
              <div className="text-center py-12">
                <div className="mx-auto h-12 w-12 text-[#6D7C8D] mb-4">
                  <Search className="h-12 w-12" />
                </div>
                <h3 className="text-lg font-medium text-[#030303] dark:text-white mb-2">No delegates found</h3>
                <p className="text-[#6D7C8D] dark:text-gray-400 mb-4">Try adjusting your search or filter criteria</p>
                <Button
                  onClick={() => {
                    setSearchQuery("")
                    setActiveTab("all")
                  }}
                  className="bg-[#10b981] text-white hover:bg-emerald-600"
                >
                  Clear filters
                </Button>
              </div>
            )}
          </section>
        </motion.main>
        <Footer />
      </div>
    </>
  )
}

export default ExplorePage
