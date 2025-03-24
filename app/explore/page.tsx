"use client"

import type React from "react"
import { useEffect, useState, useRef } from "react"
import Head from "next/head"
import Image from "next/image"
import { TrendingUp, TrendingDown, Users, ChevronLeft, ChevronRight, Search, Filter, ChevronsUpDown, X } from 'lucide-react'
import toast from "react-hot-toast"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import Header from "@/components/MainLayout/Header"
import Footer from "@/components/Footer"
import { useSettingTheme } from "@/store/setting/selector"
import Headroom from "react-headroom"
import { delegatesData, formatNameForURL } from "@/lib/delegate-data"

const fetchDelegates = async () => {
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
  await delay(1500)

  return delegatesData.map((delegate) => ({
    ...delegate,
    votingPower: 0,
    distributed: 0,
    totalDelegations: 0,
    performance7D: 0,
    rewardAPR: "0.00%",
    imageUrl: delegate.image,
    tags: [],
  }))
}

const handleCopyClick = (e: React.MouseEvent, address: string) => {
  e.preventDefault()
  e.stopPropagation()
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
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  const truncateAddressMiddle = (address: string, startChars = 6, endChars = 4) => {
    if (!address) return '';
    if (address.length <= startChars + endChars) return address;
    
    const start = address.substring(0, startChars);
    const end = address.substring(address.length - endChars);
    
    return `${start}..${end}`;
  };

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
    setCurrentPage(1)
  }, [searchQuery, activeTab, tableData])

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

  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentItems = filteredDelegates.slice(indexOfFirstItem, indexOfLastItem)

  const paginate = (pageNumber: number) => {
    setCurrentPage(pageNumber)
    window.scrollTo({ top: 0, behavior: "smooth" })
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
          {/* Table Section */}
          <section>
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-[#030303] dark:text-white mb-1">Explore Delegates</h2>
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
                          className="text-gray-500 hover:text-gray-700 dark:text-[#ccd8e8] dark:hover:text-gray-200"
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
                              : "text-[#6D7C8D] dark:text-[#ccd8e8] hover:bg-gray-100 dark:hover:bg-[#232F3B]"
                          }`}
                        >
                          All Delegates
                        </button>
                        <button
                          onClick={() => handleFilterSelect("positive")}
                          className={`w-full text-left px-4 py-2 text-sm rounded-md transition-colors ${
                            activeTab === "positive"
                              ? "bg-[#EFF2F5] dark:bg-[#2d3d4d] text-[#030303] dark:text-white"
                              : "text-[#6D7C8D] dark:text-[#ccd8e8] hover:bg-gray-100 dark:hover:bg-[#232F3B]"
                          }`}
                        >
                          Positive Performance
                        </button>
                        <button
                          onClick={() => handleFilterSelect("negative")}
                          className={`w-full text-left px-4 py-2 text-sm rounded-md transition-colors ${
                            activeTab === "negative"
                              ? "bg-[#EFF2F5] dark:bg-[#2d3d4d] text-[#030303] dark:text-white"
                              : "text-[#6D7C8D] dark:text-[#ccd8e8] hover:bg-gray-100 dark:hover:bg-[#232F3B]"
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
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-[#17212B] rounded-md border border-[#efefef] dark:border-[#232F3B] overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full mx-auto" role="table" style={{ tableLayout: "fixed" }}>
                  <thead className="bg-[#F9FAFB] dark:bg-[#17212B]" role="rowgroup">
                    <tr role="row">
                      <th
                        scope="col"
                        className="px-6 py-3 text-sm font-semibold text-left text-[#6D7C8D] whitespace-nowrap"
                        style={{ width: "80px" }}
                      >
                        <div className="flex items-center justify-start cursor-pointer">
                          Rank
                          <ChevronsUpDown className="ml-1 h-4 w-4 text-[#6D7C8D]" />
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-sm font-semibold text-left text-[#6D7C8D] whitespace-nowrap"
                        style={{ width: "180px" }}
                      >
                        <div className="flex items-center justify-start cursor-pointer">
                          Delegate
                          <ChevronsUpDown className="ml-1 h-4 w-4 text-[#6D7C8D]" />
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-sm font-semibold text-left text-[#6D7C8D] whitespace-nowrap"
                        style={{ width: "120px" }}
                      >
                        <div className="flex items-center justify-start cursor-pointer">
                          <span className="hidden sm:inline">APR</span>
                          <span className="sm:hidden">APR</span>
                          <ChevronsUpDown className="ml-1 h-4 w-4 text-[#6D7C8D]" />
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-sm font-semibold text-left text-[#6D7C8D] whitespace-nowrap"
                        style={{ width: "120px" }}
                      >
                        <div className="flex items-center justify-start cursor-pointer">
                          <span className="hidden sm:inline">Distributed</span>
                          <span className="sm:hidden">Dist.</span>
                          <ChevronsUpDown className="ml-1 h-4 w-4 text-[#6D7C8D]" />
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-sm font-semibold text-left text-[#6D7C8D] whitespace-nowrap"
                        style={{ width: "120px" }}
                      >
                        <div className="flex items-center justify-start cursor-pointer">
                          <span className="hidden sm:inline">Vote Power</span>
                          <span className="sm:hidden">Vote Po.</span>
                          <ChevronsUpDown className="ml-1 h-4 w-4 text-[#6D7C8D]" />
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-sm font-semibold text-left text-[#6D7C8D] whitespace-nowrap"
                        style={{ width: "120px" }}
                      >
                        <div className="flex items-center justify-start cursor-pointer">
                          <span className="hidden sm:inline">Delegations</span>
                          <span className="sm:hidden">Delegat.</span>
                          <ChevronsUpDown className="ml-1 h-4 w-4 text-[#6D7C8D]" />
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-sm font-semibold text-left text-[#6D7C8D] whitespace-nowrap"
                        style={{ width: "120px" }}
                      >
                        <div className="flex items-center justify-start cursor-pointer">
                          <span className="hidden sm:inline">7D Perf.</span>
                          <span className="sm:hidden">7D Perf.</span>
                          <ChevronsUpDown className="ml-1 h-4 w-4 text-[#6D7C8D]" />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? Array.from({ length: 10 }).map((_, index) => (
                          <tr key={index} className="border-b dark:border-b-[#232F3B] border-b-[#efefef]">
                            <td className="px-6 py-4 animate-pulse" style={{ width: "80px" }}>
                              <div className="w-5 h-5 bg-gray-300 dark:bg-[#33475b] rounded-full"></div>
                            </td>
                            <td className="px-6 py-4 animate-pulse" style={{ width: "180px" }}>
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gray-300 dark:bg-[#33475b] rounded-full"></div>
                                <div className="w-24 h-4 bg-gray-300 dark:bg-[#33475b] rounded-md"></div>
                              </div>
                            </td>
                            <td className="px-6 py-4 animate-pulse" style={{ width: "120px" }}>
                              <div className="w-12 h-4 bg-gray-300 dark:bg-[#33475b] rounded-md"></div>
                            </td>
                            <td className="px-6 py-4 animate-pulse" style={{ width: "120px" }}>
                              <div className="w-12 h-4 bg-gray-300 dark:bg-[#33475b] rounded-md"></div>
                            </td>
                            <td className="px-6 py-4 animate-pulse" style={{ width: "120px" }}>
                              <div className="w-16 h-4 bg-gray-300 dark:bg-[#33475b] rounded-md"></div>
                            </td>
                            <td className="px-6 py-4 animate-pulse" style={{ width: "120px" }}>
                              <div className="w-12 h-4 bg-gray-300 dark:bg-[#33475b] rounded-md"></div>
                            </td>
                            <td className="px-6 py-4 animate-pulse" style={{ width: "120px" }}>
                              <div className="w-10 h-4 bg-gray-300 dark:bg-[#33475b] rounded-md"></div>
                            </td>
                          </tr>
                        ))
                      : currentItems.map((delegate, index) => (
                          <motion.tr
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            key={delegate.id}
                            className="border-b dark:border-b-[#232F3B] border-b-[#efefef] cursor-pointer dark:bg-[#1D2833] hover:bg-[#f9f9f9] dark:hover:bg-[#24313d] transition-colors duration-150"
                            onClick={() => {
                              window.location.href = `/delegate/${formatNameForURL(delegate.name)}`
                            }}
                          >
                            <td
                              className="px-6 text-[#030303] py-4 dark:text-[#ccd8e8] text-sm"
                              style={{ width: "80px" }}
                            >
                              #{index + 1 + (currentPage - 1) * itemsPerPage}
                            </td>
                            <td className="flex items-center py-3 gap-3 px-6" style={{ width: "180px" }}>
                              <div className="relative overflow-hidden rounded-full min-w-[36px] min-h-[36px] w-[36px] h-[36px]">
                                <Image
                                  src={delegate.image || "/placeholder.svg"}
                                  alt={delegate.name}
                                  width={36}
                                  height={36}
                                  className="object-cover rounded-full"
                                  unoptimized
                                />
                              </div>
                              <div>
                                <span className="text-[#030303] text-sm font-semibold truncate dark:text-white block mb-[-3px]">
                                  {delegate.name}
                                </span>
                                <span className="text-xs text-[#6D7C8D] dark:text-[#ccd8e8]">{truncateAddressMiddle(delegate.address)}</span>
                              </div>
                            </td>
                            <td
                              className="px-6 text-[#030303] text-sm py-4 dark:text-[#ccd8e8]"
                              style={{ width: "120px" }}
                            >
                              <span className="">{delegate.rewardAPR}</span>
                            </td>
                            <td
                              className="px-6 text-[#030303] text-sm py-4 dark:text-[#ccd8e8]"
                              style={{ width: "120px" }}
                            >
                              {parseFloat(delegate.distributed).toFixed(2)} COMP
                            </td>
                            <td
                              className="px-6 text-[#030303] text-sm py-4 dark:text-[#ccd8e8]"
                              style={{ width: "120px" }}
                            >
                              <div className="flex items-center">
                                <div className="w-16 bg-gray-200 dark:bg-[#425365] rounded-full h-1.5 mr-2">
                                  <div
                                    className="bg-emerald-500 h-1.5 rounded-full"
                                    style={{ width: `${delegate.votingPower}%` }}
                                  ></div>
                                </div>
                                <span>{delegate.votingPower}%</span>
                              </div>
                            </td>
                            <td
                              className="px-6 text-[#030303] text-sm py-4 dark:text-[#ccd8e8]"
                              style={{ width: "120px" }}
                            >
                              <div className="flex items-center">
                                <Users className="h-3.5 w-3.5 mr-1.5 text-[#6D7C8D] dark:text-[#ccd8e8]" />
                                {delegate.totalDelegations}
                              </div>
                            </td>
                            <td
                              className={`px-6 py-4 text-sm font-medium ${delegate.performance7D >= 0 ? "text-[#3ec89a] dark:text-[#5fe7b9]" : "text-[#f54a4a] dark:text-[#d67979]"}`}
                              style={{ width: "120px" }}
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
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="bg-white dark:bg-[#1D2833] border-gray-200 dark:border-[#232F3B]"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  {Array.from({ length: Math.ceil(filteredDelegates.length / itemsPerPage) }).map((_, index) => (
                    <Button
                      key={index + 1}
                      variant="outline"
                      size="sm"
                      onClick={() => paginate(index + 1)}
                      className={`px-3 py-1 ${
                        currentPage === index + 1
                          ? "bg-[#10b981] font-semibold text-white dark:text-[#0D131A] hover:bg-emerald-600 hover:text-white"
                          : "bg-white dark:bg-[#1D2833] border-gray-200 dark:border-[#232F3B]"
                      }`}
                    >
                      {index + 1}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === Math.ceil(filteredDelegates.length / itemsPerPage)}
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
                <p className="text-[#6D7C8D] dark:text-[#ccd8e8] mb-4">Try adjusting your search or filter criteria</p>
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
