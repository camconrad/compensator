"use client";

import Footer from "@/components/Footer";
import Header from "@/components/MainLayout/Header";
import { Button } from "@/components/ui/button";
import { delegatesData, formatNameForURL } from "@/lib/delegate-data";
import compensatorServices from "@/services/compensator";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Filter,
  Search,
  TrendingDown,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import Head from "next/head";
import Image from "next/image";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import Headroom from "react-headroom";
import toast from "react-hot-toast";
import blockies from 'ethereum-blockies-png'
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const fetchDelegates = async () => {
  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));
  await delay(1500);

  return delegatesData.map((delegate) => ({
    ...delegate,
    votingPower: 0,
    distributed: 0,
    totalDelegations: 0,
    performance7D: 0,
    rewardAPR: "0.00%",
    imageUrl: delegate.image,
    tags: [],
  }));
};

const handleCopyClick = (e: React.MouseEvent, address: string) => {
  e.preventDefault();
  e.stopPropagation();
  navigator.clipboard
    .writeText(address)
    .then(() => {
      toast.success("Address copied", {
        style: {
          fontWeight: "600",
        },
      });
    })
    .catch(() => {
      toast.error("Failed to copy address.", {
        style: {
          fontWeight: "600",
        },
      });
    });
};

const ExplorePage = () => {
  const router = useRouter();
  const [tableData, setTableData] = useState<any[]>([]);
  const [filteredDelegates, setFilteredDelegates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState({
    sm: 6,    // Small screens
    md: 10,   // Medium screens
    lg: 14,   // Large screens
    xl: 20    // Extra large screens
  });
  const [listDelegatesFormFactory, setListDelegatesFromServer] = useState([]);

  const truncateAddressMiddle = (
    address: string,
    startChars = 6,
    endChars = 4
  ) => {
    if (!address) return "";
    if (address.length <= startChars + endChars) return address;

    const start = address.substring(0, startChars);
    const end = address.substring(address.length - endChars);

    return `${start}..${end}`;
  };

  const handleGetDelegatesFromServer = async () => {
    try {
      const response = await compensatorServices.getListCompensators();
      const data = response.data || [];
      const delegates = data.map((delegate: any) => {
        const dataURL = blockies.createDataURL({ seed: delegate?.compensatorAddress || delegate?.delegate })
        return {
          name: delegate?.name,
          address: delegate?.compensatorAddress,
          votingPower: Number(delegate?.votingPower || 0),
          distributed: delegate?.totalDelegatedCOMP || 0,
          totalDelegations: delegate?.totalDelegations || 0,
          performance7D: delegate?.performance7D || 0,
          rewardAPR: `${Number(delegate?.rewardRate || 0).toFixed(2)}%`,
          image: delegate?.image || dataURL,
        };
      });
      setListDelegatesFromServer(delegates);
    } catch (error) {
      console.log("error :>> ", error);
    }
  };

  useEffect(() => {
    const loadDelegates = async () => {
      setLoading(true);
      const delegates = await fetchDelegates();
      setTableData(delegates);
      setFilteredDelegates(delegates);
      setLoading(false);
    };
    loadDelegates();
    handleGetDelegatesFromServer();
  }, []);

  useEffect(() => {
    let filtered = [...tableData, ...listDelegatesFormFactory];

    if (activeTab === "positive") {
      filtered = filtered.filter((delegate) => delegate.performance7D >= 0);
    } else if (activeTab === "negative") {
      filtered = filtered.filter((delegate) => delegate.performance7D < 0);
    }

    setFilteredDelegates(filtered);
    setCurrentPage(1);
  }, [activeTab, tableData, listDelegatesFormFactory]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target as Node)
      ) {
        setIsFilterOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleFilter = () => {
    setIsFilterOpen(!isFilterOpen);
  };

  const handleFilterSelect = (filter: string) => {
    setActiveTab(filter);
    setIsFilterOpen(false);
  };

  const getItemsPerPage = () => {
    if (typeof window === 'undefined') return itemsPerPage.sm;
    const width = window.innerWidth;
    if (width >= 1280) return itemsPerPage.xl;
    if (width >= 1024) return itemsPerPage.lg;
    if (width >= 768) return itemsPerPage.md;
    return itemsPerPage.sm;
  };

  const currentItemsPerPage = getItemsPerPage();
  const indexOfLastItem = currentPage * currentItemsPerPage;
  const indexOfFirstItem = indexOfLastItem - currentItemsPerPage;
  const currentItems = filteredDelegates.slice(
    indexOfFirstItem,
    indexOfLastItem
  );

  const paginate = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <Head>
        <title>Explore Delegates | Compensator</title>
        <meta
          name="description"
          content="Explore and discover delegates on the Compound delegate marketplace."
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-[1100px] mx-auto p-4 mt-4"
        >
          {/* Table Section */}
          <section>
            <div className="flex flex-col gap-4 mb-2">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#030303] dark:text-white mb-[-10px] md:mb-[-12px]">
                  Explore Delegates
                </h2>

                {/* Filter Tabs */}
                <Tabs defaultValue="all" value={activeTab} onValueChange={handleFilterSelect}>
                  <TabsList className="flex mb-[-6px] font-semibold md:mb-[0px] bg-white dark:bg-[#1D2833] rounded-full p-1 transition-all duration-100 ease-linear">
                    <TabsTrigger
                      value="all"
                      className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors data-[state=active]:bg-[#EFF2F5] data-[state=active]:dark:bg-[#2d3d4d] data-[state=active]:text-[#030303] data-[state=active]:dark:text-white data-[state=active]:shadow-sm ${
                        activeTab === "all"
                          ? ""
                          : "text-[#6D7C8D] dark:text-gray-400 hover:text-[#030303] dark:hover:text-gray-200"
                      }`}
                    >
                      All Delegates
                    </TabsTrigger>
                    <TabsTrigger
                      value="performance"
                      className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors data-[state=active]:bg-[#EFF2F5] data-[state=active]:dark:bg-[#2d3d4d] data-[state=active]:text-[#030303] data-[state=active]:dark:text-white data-[state=active]:shadow-sm ${
                        activeTab === "performance"
                          ? ""
                          : "text-[#6D7C8D] dark:text-gray-400 hover:text-[#030303] dark:hover:text-gray-200"
                      }`}
                    >
                      Performance
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-[#17212B] rounded-md border border-[#efefef] dark:border-[#232F3B] overflow-hidden mt-4"
            >
              <div className="overflow-x-auto">
                <table
                  className="w-full mx-auto"
                  role="table"
                  style={{ tableLayout: "fixed" }}
                >
                  <thead
                    className="bg-[#F9FAFB] dark:bg-[#17212B]"
                    role="rowgroup"
                  >
                    <tr role="row">
                      <th
                        scope="col"
                        className="px-6 py-3 text-sm font-semibold text-left text-[#6D7C8D] whitespace-nowrap"
                        style={{ width: "80px" }}
                      >
                        <div className="flex items-center justify-start cursor-pointer">
                          Rank
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-sm font-semibold text-left text-[#6D7C8D] whitespace-nowrap"
                        style={{ width: "180px" }}
                      >
                        <div className="flex items-center justify-start cursor-pointer">
                          Delegate
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
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? Array.from({ length: 10 }).map((_, index) => (
                          <tr
                            key={index}
                            className="border-b dark:border-b-[#232F3B] border-b-[#efefef]"
                          >
                            <td
                              className="px-6 py-4 animate-pulse"
                              style={{ width: "80px" }}
                            >
                              <div className="w-5 h-5 bg-gray-300 dark:bg-[#33475b] rounded-full"></div>
                            </td>
                            <td
                              className="px-6 py-4 animate-pulse"
                              style={{ width: "180px" }}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gray-300 dark:bg-[#33475b] rounded-full"></div>
                                <div className="w-24 h-4 bg-gray-300 dark:bg-[#33475b] rounded-md"></div>
                              </div>
                            </td>
                            <td
                              className="px-6 py-4 animate-pulse"
                              style={{ width: "120px" }}
                            >
                              <div className="w-12 h-4 bg-gray-300 dark:bg-[#33475b] rounded-md"></div>
                            </td>
                            <td
                              className="px-6 py-4 animate-pulse"
                              style={{ width: "120px" }}
                            >
                              <div className="w-12 h-4 bg-gray-300 dark:bg-[#33475b] rounded-md"></div>
                            </td>
                            <td
                              className="px-6 py-4 animate-pulse"
                              style={{ width: "120px" }}
                            >
                              <div className="w-16 h-4 bg-gray-300 dark:bg-[#33475b] rounded-md"></div>
                            </td>
                            <td
                              className="px-6 py-4 animate-pulse"
                              style={{ width: "120px" }}
                            >
                              <div className="w-12 h-4 bg-gray-300 dark:bg-[#33475b] rounded-md"></div>
                            </td>
                            <td
                              className="px-6 py-4 animate-pulse"
                              style={{ width: "120px" }}
                            >
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
                              router.push(`/delegate/${delegate.address}`);
                            }}
                          >
                            <td
                              className="px-6 text-[#030303] py-4 dark:text-[#ccd8e8] text-sm"
                              style={{ width: "80px" }}
                            >
                              #{index + 1 + (currentPage - 1) * currentItemsPerPage}
                            </td>
                            <td
                              className="flex items-center py-3 gap-3 px-6"
                              style={{ width: "180px" }}
                            >
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
                                <span className="text-xs text-[#6D7C8D] dark:text-[#ccd8e8]">
                                  {truncateAddressMiddle(delegate.address)}
                                </span>
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
                                    style={{
                                      width: `${delegate.votingPower}%`,
                                    }}
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
                              className={`px-6 py-4 text-sm font-medium ${
                                delegate.performance7D >= 0
                                  ? "text-[#3ec89a] dark:text-[#5fe7b9]"
                                  : "text-[#f54a4a] dark:text-[#d67979]"
                              }`}
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
                  {Array.from({
                    length: Math.ceil(filteredDelegates.length / currentItemsPerPage),
                  }).map((_, index) => (
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
                    disabled={
                      currentPage ===
                      Math.ceil(filteredDelegates.length / currentItemsPerPage)
                    }
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
                <h3 className="text-lg font-medium text-[#030303] dark:text-white mb-2">
                  No delegates found
                </h3>
                <p className="text-[#6D7C8D] dark:text-[#ccd8e8] mb-4">
                  Try adjusting your search or filter criteria
                </p>
                <Button
                  onClick={() => {
                    setActiveTab("all");
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
  );
};

export default ExplorePage;
