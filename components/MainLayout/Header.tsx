"use client"

import type React from "react"

import authServices from "@/services/auth"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useState, useRef } from "react"
import { useAccount } from "wagmi"
import ConnectWalletButton from "./ConnectWalletButton"
import httpClient from "@/services/httpClient"
import { useSelectedAccessToken, useSelectedAuthActions } from "@/store/auth/selector"
import NetworkDropdown from "./NetworkDropdown"
import { usePathname } from "next/navigation"
// Import icons from React Icons (Font Awesome solid)
import { FaHome, FaCompass, FaUser, FaFileAlt } from "react-icons/fa"

const Header = () => {
  const [isAtTop, setIsAtTop] = useState(true)
  const { setAddress, setAccessToken } = useSelectedAuthActions()
  const accessToken = useSelectedAccessToken()
  const pathname = usePathname()

  const { address } = useAccount()
  const [hoveredTab, setHoveredTab] = useState<string | null>(null)
  const navRef = useRef<HTMLDivElement>(null)
  const indicatorRef = useRef<HTMLDivElement>(null)

  // Using filled icons from React Icons
  const navItems = [
    {
      name: "Home",
      href: "/",
      icon: <FaHome className="w-3 h-3 text-[#6D7D8E] mr-2" />,
    },
    {
      name: "Explore",
      href: "#",
      icon: <FaCompass className="w-3 h-3 text-[#6D7D8E] mr-2" />,
    },
    {
      name: "Profile",
      href: "#",
      icon: <FaUser className="w-3 h-3 text-[#6D7D8E] mr-2" />,
    },
    {
      name: "Docs",
      href: "#",
      external: true,
      icon: <FaFileAlt className="w-3 h-3 text-[#6D7D8E] mr-2" />,
    },
  ]

  const handleLogin = async () => {
    try {
      const response = await authServices.login(address as string)
      httpClient.setAccessToken(response?.data?.access_token)
      setAddress(address as string)
      setAccessToken(response?.data?.access_token)
    } catch (error) {
      console.log("error :>> ", error)
    }
  }

  const handleGetProfile = async () => {
    try {
      const response = await authServices.getProfile(address as string)
      console.log("response :>> ", response)
    } catch (error) {
      console.log("error :>> ", error)
    }
  }

  useEffect(() => {
    if (address) {
      handleLogin()
    }
  }, [address])

  useEffect(() => {
    if (accessToken) {
      handleGetProfile()
    }
  }, [accessToken])

  useEffect(() => {
    const handleScroll = () => {
      setIsAtTop(window.scrollY === 0)
    }

    window.addEventListener("scroll", handleScroll)
    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [])

  // Set the active tab based on the current path
  useEffect(() => {
    const currentPath = pathname
    const activeItem = navItems.find((item) => item.href === currentPath)
    if (activeItem) {
      setHoveredTab(activeItem.name)
    } else {
      // If we're on a subpage, highlight the parent section
      if (currentPath.startsWith("/explore")) setHoveredTab("Explore")
      else if (currentPath.startsWith("/profile")) setHoveredTab("Profile")
      else setHoveredTab("Home")
    }
  }, [pathname])

  // Update the indicator position when hovering or when the active tab changes
  useEffect(() => {
    if (!navRef.current || !indicatorRef.current || !hoveredTab) return

    const navElement = navRef.current
    const indicator = indicatorRef.current

    const activeTabElement = navElement.querySelector(`[data-name="${hoveredTab}"]`) as HTMLElement

    if (activeTabElement) {
      const tabRect = activeTabElement.getBoundingClientRect()
      const navRect = navElement.getBoundingClientRect()

      // Set the width and height to match the tab
      indicator.style.width = `${tabRect.width}px`
      indicator.style.height = `${tabRect.height}px`
      indicator.style.transform = `translateX(${tabRect.left - navRect.left}px)`
    }
  }, [hoveredTab])

  return (
    <header className="inset-x-0 left-0 top-0 w-full transition-colors duration-200 bg-[#EFF2F5] dark:bg-[#0D131A] backdrop-blur-lg">
      <div className="flex items-center justify-between w-full px-4 max-w-[1100px] py-3 mx-auto">
        <div className="flex items-center justify-start">
          <Link href="/" className="mr-4">
            <div className="w-auto flex items-center gap-2">
              <Image src="/icon.png" alt="Compound icon" width={24} height={24} className="mb-1" />
              <div className="">
                <h1 className="text-xl font-bold text-[#030303] dark:text-white">Compensator</h1>
              </div>
            </div>
          </Link>

          <div className="hidden md:block relative">
            <nav ref={navRef} className="flex items-center space-x-1 relative">
              {/* Sliding background indicator */}
              <div
                ref={indicatorRef}
                className="absolute rounded-full dark:bg-[#1D2833] bg-[#D7DFE4] transition-all duration-200 ease-in-out z-0"
              />

              {navItems.map((item) =>
                item.external ? (
                  <a
                    key={item.name}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-name={item.name}
                    className={`px-2 py-1 rounded-full text-sm font-semibold relative z-10 transition-colors duration-200 flex items-center
                      ${hoveredTab === item.name ? "text-[#17212B] dark:text-white" : "dark:text-white text-[#17212B]"}`}
                    onMouseEnter={() => setHoveredTab(item.name)}
                    onMouseLeave={() =>
                      setHoveredTab(
                        pathname === "/"
                          ? "Home"
                          : pathname === "/explore"
                            ? "Explore"
                            : pathname === "/profile"
                              ? "Profile"
                              : "Home",
                      )
                    }
                  >
                    {item.icon}
                    {item.name}
                  </a>
                ) : (
                  <Link
                    key={item.name}
                    href={item.href}
                    data-name={item.name}
                    className={`px-2 py-1 rounded-full text-sm font-semibold relative z-10 transition-colors duration-200 flex items-center
                      ${hoveredTab === item.name ? "text-[#17212B]" : "dark:text-white text-[#17212B]"}`}
                    onMouseEnter={() => setHoveredTab(item.name)}
                    onMouseLeave={() =>
                      setHoveredTab(
                        pathname === "/"
                          ? "Home"
                          : pathname === "/explore"
                            ? "Explore"
                            : pathname === "/profile"
                              ? "Profile"
                              : "Home",
                      )
                    }
                  >
                    {item.icon}
                    {item.name}
                  </Link>
                ),
              )}
            </nav>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 md:space-x-4">
          {/* Mobile Navigation */}
          <div className="md:hidden flex items-center mr-2">
            <MobileNavigation navItems={navItems} currentPath={pathname} />
          </div>
          <div className="">
            <NetworkDropdown />
          </div>
          <div className="">
            <ConnectWalletButton />
          </div>
        </div>
      </div>
    </header>
  )
}

// Mobile Navigation Component
const MobileNavigation = ({
  navItems,
  currentPath,
}: { navItems: { name: string; href: string; external?: boolean; icon: React.ReactNode }[]; currentPath: string }) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-md text-gray-400 bg-[#D7DFE4] dark:hover:bg-white/10 hover:text-white"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 w-48 bg-[#1D2833] rounded-md shadow-lg py-1 z-50">
          {navItems.map((item) =>
            item.external ? (
              <a
                key={item.name}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center px-2 py-1 text-sm ${currentPath === item.href ? "bg-[#1D2833] text-white" : "text-[#17212B]"}`}
                onClick={() => setIsOpen(false)}
              >
                {item.icon}
                {item.name}
              </a>
            ) : (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-2 py-1 text-sm ${currentPath === item.href ? "bg-[#1D2833] text-white" : "text-[#17212B]"}`}
                onClick={() => setIsOpen(false)}
              >
                {item.icon}
                {item.name}
              </Link>
            ),
          )}
        </div>
      )}
    </div>
  )
}

export default Header
