"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaSearch, FaClock, FaChartLine } from "react-icons/fa";
import { HiMiniSlash } from "react-icons/hi2";
import { IoMdClose } from "react-icons/io";
import useDelegates from "@/hooks/useDelegates";
import _ from "lodash";
import Link from "next/link";
import {
  useMainLayoutActions
  // useMainLayoutRecentSearchDelegateIds,
} from "@/store/main-layout/selector";

const SearchBar = () => {
  const { delegates: fetchedDelegates = [], loading, error } = useDelegates(); // Fallback to an empty array
  // const recentDelegateIds = useMainLayoutRecentSearchDelegateIds();
  const { addRecentAgentSearch } = useMainLayoutActions();
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const searchBarRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const suggestions = useMemo(() => {
    if (!searchQuery) return [];
    
    const searchedDelegates = fetchedDelegates.filter(
      (delegate) =>
        delegate?.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        delegate?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const recentSearchDelegates = fetchedDelegates
      // .filter((delegate) => recentDelegateIds?.includes(delegate?.id))
      ?.slice(0, 3);

    return _.unionBy(searchedDelegates?.concat(recentSearchDelegates), "id");
    // }, [fetchedDelegates, searchQuery, recentDelegateIds]);
  }, [fetchedDelegates, searchQuery]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleClearSearch = () => {
    setSearchQuery(""); // Clear the search query
    if (inputRef.current) {
      inputRef.current.focus(); // Keep focus on input after clearing
    }
  };

  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => {
    // Don't immediately blur to allow clicking on search results
    setTimeout(() => {
      if (!searchBarRef.current?.contains(document.activeElement)) {
        setIsFocused(false);
      }
    }, 100);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchBarRef.current && !searchBarRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === "/" && document.activeElement?.tagName !== "INPUT") {
        event.preventDefault();
        inputRef.current?.focus();
      } else if (event.key === "Escape") {
        setIsFocused(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => {
      document.removeEventListener("keydown", handleKeyPress);
    };
  }, []);

  // Animation variants
  const containerVariants = {
    focused: { scale: 1, boxShadow: "0 4px 20px rgba(0, 0, 0, 0.01)" },
    unfocused: { scale: 1, boxShadow: "0 0 0 rgba(0, 0, 0, 0)" }
  };

  const dropdownVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0 }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.2
      }
    })
  };

  const hasResults = suggestions.length > 0 || fetchedDelegates.length > 0;

  return (
    <div className="relative w-full md:max-w-[320px] ml-[-20px] font-sans" ref={searchBarRef}>
      <motion.div
        className={`relative rounded-lg bg-transparent ${
          isFocused
            ? "border-emerald-300 dark:border-emerald-700" // Focused state
            : "border-[#efefef] dark:border-[#28303e]" // Unfocused state
        } transition-colors`}
        initial="unfocused"
        animate={isFocused ? "focused" : "unfocused"}
        variants={containerVariants}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        <div className="relative h-[42px]">
          <input
            type="text"
            ref={inputRef}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            className="absolute inset-0 p-2 mt-2 text-xs rounded-lg pl-10 pr-12 w-full transition-all bg-transparent text-[#030303] dark:text-white outline-none"
            autoComplete="off"
          />
          <label 
            htmlFor="delegate-search" 
            className={`absolute left-9 font-medium pointer-events-none transition-all duration-200 ${
              isFocused || searchQuery ? 
              'text-xs text-emerald-500 dark:text-emerald-400 top-1' : 
              'text-sm text-[#6D7C8D] dark:text-gray-400 top-1/2 -translate-y-1/2'
            }`}
          >
            Search delegates
          </label>
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#6D7C8D] dark:text-[#afafaf]">
            <FaSearch />
          </div>

          {/* Slash/Close Icon */}
          <div className="absolute flex items-center justify-center w-[26px] h-[26px] text-[16px] font-semibold text-[#595959] dark:text-[#afafaf] transform -translate-y-1/2 bg-white dark:bg-gray-700 rounded-[6px] right-2 top-1/2">
            <AnimatePresence mode="wait">
              {!searchQuery ? (
                <motion.span
                  key="slash"
                  initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.5, rotate: 90 }}
                  transition={{ duration: 0.14 }}
                  className="flex items-center justify-center"
                >
                  <HiMiniSlash size={18} style={{ verticalAlign: "middle" }} />
                </motion.span>
              ) : (
                <motion.button
                  key="close"
                  onClick={handleClearSearch}
                  initial={{ opacity: 0, scale: 0.5, rotate: 90 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.5, rotate: -90 }}
                  transition={{ duration: 0.14 }}
                  className="flex items-center justify-center text-[#595959] dark:text-[#afafaf] hover:text-[#030303] dark:hover:text-white focus:outline-none"
                  aria-label="Clear search"
                >
                  <IoMdClose size={18} style={{ verticalAlign: "middle"}} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {isFocused && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={dropdownVariants}
            transition={{ duration: 0.2 }}
            className="absolute z-10 w-full max-w-[402px] mt-2 bg-white dark:bg-[#1D2833] border border-[#efefef] dark:border-[#28303e] rounded-lg shadow-lg p-4 overflow-y-auto max-h-[400px]"
          >
            {!searchQuery && (
              <div>
                <div className="flex items-center mb-2 text-sm font-semibold text-[#595959] dark:text-[#afafaf]">
                  <FaClock className="mr-2" />
                  Recent searches
                </div>
                <ul className="mb-4">
                  {fetchedDelegates?.slice(0, 3)?.map((delegate: any, index) => (
                    <Link
                      href={`/${delegate?.id}`}
                      key={`recent-${index}`}
                      onClick={() => {
                        addRecentAgentSearch(delegate?.id);
                        setIsFocused(false);
                      }}
                    >
                      <motion.li
                        custom={index}
                        variants={itemVariants}
                        className="flex items-center justify-between px-4 py-2 transition bg-white dark:bg-[#1D2833] rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-[#131313]"
                      >
                        <div className="flex items-center space-x-3">
                          <img src={delegate?.imageUrl} alt="" className="w-8 h-8 rounded-full" />
                          <span className="text-[#030303] dark:text-white line-clamp-1">
                            {delegate?.name}
                          </span>
                        </div>
                        <div
                          className={`text-sm ${
                            delegate.priceChange24h >= 0 ? "text-green-500" : "text-red-500"
                          }`}
                        >
                          {delegate.priceChange24h >= 0 ? "+" : "-"}
                          {Math.abs(delegate.priceChange24h).toFixed(2)}$
                        </div>
                      </motion.li>
                    </Link>
                  ))}
                </ul>
              </div>
            )}

            {searchQuery && suggestions.length > 0 && (
              <div>
                <div className="flex items-center mb-2 text-sm font-medium text-[#595959] dark:text-[#afafaf]">
                  <FaSearch className="mr-2" />
                  Search results
                </div>
                <ul className="mb-4">
                  {suggestions.map((delegate: any, index) => (
                    <Link
                      href={`/${delegate?.id}`}
                      key={`search-${index}`}
                      onClick={() => {
                        addRecentAgentSearch(delegate?.id);
                        setIsFocused(false);
                      }}
                    >
                      <motion.li
                        custom={index}
                        variants={itemVariants}
                        className="flex items-center justify-between px-4 py-2 transition bg-white dark:bg-[#1D2833] rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-[#131313]"
                      >
                        <div className="flex items-center space-x-3">
                          <img src={delegate?.imageUrl} alt="" className="w-8 h-8 rounded-full" />
                          <span className="text-[#030303] dark:text-white line-clamp-1">
                            {delegate?.name}
                          </span>
                        </div>
                        <div
                          className={`text-sm ${
                            delegate.priceChange24h >= 0 ? "text-green-500" : "text-red-500"
                          }`}
                        >
                          {delegate.priceChange24h >= 0 ? "+" : "-"}
                          {Math.abs(delegate.priceChange24h).toFixed(2)}$
                        </div>
                      </motion.li>
                    </Link>
                  ))}
                </ul>
              </div>
            )}

            {/* Popular Tokens Section */}
            <div>
              <div className="flex items-center mb-2 text-sm font-medium text-[#595959] dark:text-[#afafaf]">
                <FaChartLine className="mr-2" />
                Popular delegates
              </div>
              <ul>
                {fetchedDelegates?.slice(0, 3)?.map((delegate: any, index) => (
                  <Link
                    href={`/${delegate?.id}`}
                    key={`popular-${index}`}
                    onClick={() => {
                      addRecentAgentSearch(delegate?.id);
                      setIsFocused(false);
                    }}
                  >
                    <motion.li
                      custom={index + 5} // Offset for staggered animation
                      variants={itemVariants}
                      className="flex items-center justify-between px-4 py-2 transition bg-white dark:bg-[#1D2833] rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-[#131313]"
                    >
                      <div className="flex items-center space-x-3">
                        <img src={delegate?.imageUrl} alt="" className="w-8 h-8 rounded-full" />
                        <span className="text-[#030303] dark:text-white line-clamp-1">
                          {delegate?.name}
                        </span>
                      </div>
                      <div
                        className={`text-sm ${
                          delegate.priceChange24h >= 0 ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {delegate.priceChange24h >= 0 ? "+" : "-"}
                        {Math.abs(delegate.priceChange24h).toFixed(2)}$
                      </div>
                    </motion.li>
                  </Link>
                ))}
              </ul>
            </div>

            {searchQuery && suggestions.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-6 text-center text-sm text-[#6D7C8D] dark:text-[#6D7C8D]"
              >
                No results found for "{searchQuery}"
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchBar;