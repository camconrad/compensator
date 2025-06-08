"use client";

import { useGetContract } from "@/hooks/useGetContract";
import {
  useSettingActions,
  useSettingUsdPrice,
} from "@/store/setting/selector";
import { floorFraction, getPriceToken } from "@/utils/helpers";
import {
  convertQuoteToRoute,
  executeRoute,
  getQuote,
  QuoteRequest,
} from "@lifi/sdk";
import BigNumber from "bignumber.js";
import { motion } from "framer-motion";
import { ArrowLeft, Repeat, Settings } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { IoMdClose } from "react-icons/io";
import { NumericFormat } from "react-number-format";
import { erc20Abi } from "viem";
import { useAccount } from "wagmi";

interface ModalProps {
  open: boolean;
  handleClose: () => void;
  className?: string;
  title?: string;
  hideCloseIcon?: boolean;
  children?: React.ReactNode;
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2, ease: "easeInOut" } },
};

const sidebarVariants = {
  hidden: { x: "100%", opacity: 0 },
  visible: {
    x: "0",
    opacity: 1,
    transition: { duration: 0.3, ease: "easeInOut" },
  },
};

const closeButtonVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.1 },
  tap: { scale: 0.95 },
};

const tokenIcons: Record<string, string> = {
  ETH: "/eth.svg",
  WBTC: "/wbtc.svg",
  USDT: "/usdt.svg",
  USDC: "/usdc.svg",
  COMP: "/logo.png",
};

const tokenOptions = [
  {
    name: "Ethereum",
    symbol: "ETH",
    symbolPrice: "ETH",
    contractAddress: "0x0000000000000000000000000000000000000000",
    image: "/eth.svg",
    decimals: 18,
  },
  {
    name: "WBTC",
    symbol: "WBTC",
    symbolPrice: "BTC",
    contractAddress: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
    image: "/wbtc.svg",
    decimals: 8,
  },
  {
    name: "Tether",
    symbol: "USDT",
    symbolPrice: "USDT",
    contractAddress: "0xdac17f958d2ee523a2206206994597c13d831ec7",
    image: "/usdt.svg",
    decimals: 6,
  },
  {
    name: "USDC",
    symbol: "USDC",
    symbolPrice: "USDC",
    contractAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    image: "/usdc.svg",
    decimals: 6,
  },
  {
    name: "Compound",
    symbol: "COMP",
    symbolPrice: "COMP",
    contractAddress: "0xc00e94cb662c3520282e6f5717214004a7f26888",
    image: "/logo.png",
    decimals: 18,
  },
];

const Modal = ({
  open,
  handleClose,
  className,
  title,
  hideCloseIcon = false,
  children,
}: ModalProps) => {
  const { address } = useAccount();
  const [showSwapUI, setShowSwapUI] = useState(false);
  const [fromToken, setFromToken] = useState(tokenOptions[0]);
  const [toToken, setToToken] = useState(tokenOptions[4]);
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [slippageTolerance, setSlippageTolerance] = useState(0.5); // Default slippage
  const [isSwapping, setIsSwapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenBalances, setTokenBalances] = useState<Record<string, number>>({
    ETH: 0,
    WBTC: 0,
    USDT: 0,
    USDC: 0,
    COMP: 0,
  });
  const usdPrice = useSettingUsdPrice();
  const { updateUsdPrice } = useSettingActions();
  const [showSlippagePopover, setShowSlippagePopover] = useState(false);
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const { getProvider, getReadContract } = useGetContract();

  const fromTokenPrice = usdPrice[fromToken?.symbol] || 1;
  const toTokenPrice = usdPrice[toToken?.symbol] || 1;

  useEffect(() => {
    const originalOverflow = document.body.style.overflowY;
    document.body.style.overflowY = open ? "hidden" : "auto";
    return () => {
      document.body.style.overflowY = originalOverflow;
    };
  }, [open]);

  const handleSwapClick = () => {
    setShowSwapUI(true);
  };

  const handleBackClick = () => {
    setShowSwapUI(false);
  };

  const handleSwapTokens = () => {
    const tempToken = fromToken;
    setFromToken(toToken);
    setToToken(tempToken);
    setFromAmount("");
    setToAmount("");
  };

  const handleSwap = async () => {
    if (!address) {
      setError("Please connect wallet");
      return;
    }
    if (!fromAmount || Number.parseFloat(fromAmount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    // if (Number.parseFloat(fromAmount) > tokenBalances[fromToken?.symbol]) {
    //   setError("Insufficient balance")
    //   return
    // }

    const chainId = 1;

    const amountParsed = BigNumber(fromAmount)
      .multipliedBy(BigNumber(10).pow(fromToken?.decimals))
      .toString();

    setIsSwapping(true);
    try {
      const quoteRequest: QuoteRequest = {
        fromChain: chainId,
        toChain: chainId,
        fromToken: fromToken.contractAddress,
        toToken: toToken.contractAddress,
        fromAmount: amountParsed,
        fromAddress: address!,
      };
      console.log("quoteRequest", quoteRequest);

      const quote = await getQuote(quoteRequest);

      console.log("quote", quote);

      const route = convertQuoteToRoute(quote);
      console.log("route", route);

      const executedRoute = await executeRoute(route, {
        // Gets called once the route object gets new updates
        updateRouteHook(route) {
          console.log("updateRouteHook", route);
        },
      });
      handleGetBalance();
      setFromAmount("");
      setToAmount("");
      setError(null);
    } catch (error: any) {
      console.error("handleSwap", error?.message, error);

      const rawMsg = error.message || "";
      let cleanMsg = rawMsg;

      if (/\[.*?\]/.test(rawMsg)) {
        const dotIndex = rawMsg.indexOf(".");
        if (dotIndex !== -1) {
          cleanMsg = rawMsg
            .slice(0, dotIndex + 1)
            .trim()
            .replace(/\[.*?\]\s*/g, "");
        }
      }

      if (cleanMsg) {
        setError(cleanMsg);
      }
    }

    setIsSwapping(false);

    // Simulate a swap API call
    // setTimeout(() => {
    //   setIsSwapping(false)
    //   setFromAmount("")
    //   setToAmount("")
    //   setShowSwapUI(false)
    //   alert("Swap successful!")
    // }, 2000)
  };

  const handleGetBalance = async () => {
    if (!address) {
      return;
    }
    if (!fromToken || !toToken) {
      return;
    }
    try {
      if (fromToken?.symbol === "ETH") {
        const provider = await getProvider();

        if (provider) {
          const balance = await provider.getBalance(address);
          const amountFormatted = BigNumber(balance?.toString())
            .dividedBy(BigNumber(10).pow(fromToken?.decimals))
            .toNumber();

          setTokenBalances((tokenBalances) => ({
            ...tokenBalances,
            [fromToken?.symbol]: floorFraction(amountFormatted, 5),
          }));
        }

        return;
      }

      const tokenContract = await getReadContract(
        fromToken?.contractAddress,
        JSON.stringify(erc20Abi)
      );

      if (!tokenContract) {
        return;
      }

      const decimals = await tokenContract.decimals();
      const balance = await tokenContract.balanceOf(address);
      const amountFormatted = BigNumber(balance)
        .dividedBy(BigNumber(10).pow(decimals))
        .toNumber();

      setTokenBalances((tokenBalances) => ({
        ...tokenBalances,
        [fromToken?.symbol]: floorFraction(amountFormatted, 5),
      }));
    } catch (error) {
      console.error("Modal.handleGetBalance.fromToken", error);
    }

    try {
      if (toToken?.symbol === "ETH") {
        const provider = await getProvider();

        if (provider) {
          const balance = await provider.getBalance(address);
          const amountFormatted = BigNumber(balance?.toString())
            .dividedBy(BigNumber(10).pow(toToken?.decimals))
            .toNumber();

          setTokenBalances((tokenBalances) => ({
            ...tokenBalances,
            [toToken?.symbol]: floorFraction(amountFormatted, 5),
          }));
        }

        return;
      }

      const tokenContract = await getReadContract(
        toToken?.contractAddress,
        JSON.stringify(erc20Abi)
      );

      if (!tokenContract) {
        return;
      }

      const decimals = await tokenContract.decimals();
      const balance = await tokenContract.balanceOf(address);
      const amountFormatted = BigNumber(balance)
        .dividedBy(BigNumber(10).pow(decimals))
        .toNumber();

      setTokenBalances((tokenBalances) => ({
        ...tokenBalances,
        [toToken?.symbol]: floorFraction(amountFormatted, 5),
      }));
    } catch (error) {
      console.error("Modal.handleGetBalance.toToken", error);
    }
  };

  const handleGetPriceToken = async () => {
    if (!fromToken || !toToken) {
      return;
    }
    try {
      const [fromTokenPrice, toTokenPrice] = await Promise.all([
        getPriceToken(fromToken?.symbolPrice),
        getPriceToken(toToken?.symbolPrice),
      ]);

      updateUsdPrice({
        [fromToken?.symbol]: fromTokenPrice,
        [toToken?.symbol]: toTokenPrice,
      });
    } catch (error) {
      console.error("Modal.handleGetPriceToken", error);
    }
  };

  const handleSlippageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0) {
      setSlippageTolerance(value);
    }
  };

  const handleCustomSlippage = () => {
    const custom = prompt(
      "Enter custom slippage (%):",
      slippageTolerance.toString()
    );
    const value = Number.parseFloat(custom || "0.5");
    if (!isNaN(value) && value > 0) {
      setSlippageTolerance(value);
    }
  };

  const handleTokenSelect = (
    token: (typeof tokenOptions)[0],
    isFrom: boolean
  ) => {
    if (isFrom) {
      if (token?.symbol === toToken?.symbol) {
        // If trying to set the same token, swap the tokens instead
        setFromToken(toToken);
        setToToken(fromToken);
      } else {
        setFromToken(token);
      }
      setShowFromDropdown(false);
    } else {
      if (token?.symbol === fromToken?.symbol) {
        // If trying to set the same token, swap the tokens instead
        setToToken(fromToken);
        setFromToken(toToken);
      } else {
        setToToken(token);
      }
      setShowToDropdown(false);
    }
  };

  useEffect(() => {
    handleGetBalance();
    handleGetPriceToken();
  }, [fromToken, toToken]);

  useEffect(() => {
    if (Number.isNaN(+fromAmount)) {
      setToAmount("");
    } else {
      const toAmount =
        (usdPrice[fromToken?.symbol] * parseFloat(fromAmount)) /
        usdPrice[toToken?.symbol];
      setToAmount(floorFraction(toAmount, 5)?.toString());
    }
  }, [usdPrice[fromToken?.symbol], usdPrice[toToken?.symbol]]);

  if (!open) return null;

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
                <div className="rounded-xl bg-[#EFF2F5] font-medium dark:bg-[#1D2833] border border-[#efefef] dark:border-[#28303e] p-3 mb-1">
                  <div className="flex justify-between mb-0 items-center">
                    <div className="gap-4 flex flex-col">
                      <NumericFormat
                        placeholder="0.00"
                        className="w-full border-none font-semibold bg-transparent text-xl focus:outline-none dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={fromAmount}
                        // onValueChange={(e) => {
                        //   const fromAmount = e.value;
                        //   setFromAmount(fromAmount);
                        //   if (Number.isNaN(+fromAmount)) {
                        //     setToAmount("");
                        //   } else {
                        //     const toAmount =
                        //       (usdPrice[fromToken?.symbol] *
                        //         parseFloat(fromAmount)) /
                        //       usdPrice[toToken?.symbol];
                        //     setToAmount(floorFraction(toAmount, 5)?.toString());
                        //   }
                        // }}
                        onChange={(e) => {
                          const fromAmount = e.target.value?.replaceAll(
                            ",",
                            ""
                          );
                          setFromAmount(fromAmount);
                          if (Number.isNaN(+fromAmount)) {
                            setToAmount("");
                          } else {
                            const toAmount =
                              (usdPrice[fromToken?.symbol] *
                                parseFloat(fromAmount)) /
                              usdPrice[toToken?.symbol];
                            setToAmount(floorFraction(toAmount, 5)?.toString());
                          }
                        }}
                        thousandSeparator
                      />
                      <NumericFormat
                        displayType="text"
                        className="text-xs text-[#6D7C8D]"
                        value={parseFloat(fromAmount) * fromTokenPrice || 0}
                        decimalScale={2}
                        prefix="$"
                      />
                    </div>
                    <div className="flex flex-col gap-4">
                      <div className="relative flex items-center">
                        <button
                          onClick={() =>
                            setFromAmount(
                              tokenBalances[fromToken?.symbol].toString()
                            )
                          }
                          className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#E5E7EB] dark:bg-[#2d3d4d] text-[#374151] dark:text-white hover:bg-[#D1D5DB] dark:hover:bg-[#3d4d5d] transition-colors mr-2"
                        >
                          MAX
                        </button>
                        <div
                          onClick={() => setShowFromDropdown(!showFromDropdown)}
                          className="flex items-center gap-2 rounded-lg pl-0 pr-3 w-auto cursor-pointer"
                        >
                          <img
                            src={fromToken?.image}
                            alt={fromToken?.symbol}
                            className="h-6 w-6 rounded-full"
                          />
                          <span className="text-sm font-semibold dark:text-white">
                            {fromToken?.symbol}
                          </span>
                        </div>
                        {showFromDropdown && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="absolute top-full right-0 mt-1 bg-white dark:bg-[#1D2833] rounded-xl shadow-lg border border-[#efefef] dark:border-[#28303e] w-32 z-50 p-1"
                          >
                            {tokenOptions.map((token) => (
                              <div
                                key={token?.symbol}
                                onClick={() => handleTokenSelect(token, true)}
                                className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-[#24313d] cursor-pointer rounded-lg ${
                                  token === toToken
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                }`}
                              >
                                <img
                                  src={token?.image}
                                  alt={token?.symbol}
                                  className="h-5 w-5 rounded-full"
                                />
                                <span className="text-sm font-semibold dark:text-white">
                                  {token?.symbol}
                                </span>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </div>
                      <p className="text-xs text-[#6D7C8D] flex items-center gap-1 justify-end">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="w-3.5 h-3.5"
                        >
                          <path d="M2.273 5.625A4.483 4.483 0 015.25 4.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0018.75 3H5.25a3 3 0 00-2.977 2.625zM2.273 8.625A4.483 4.483 0 015.25 7.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0018.75 6H5.25a3 3 0 00-2.977 2.625zM5.25 9a3 3 0 00-3 3v6a3 3 0 003 3h13.5a3 3 0 003-3v-6a3 3 0 00-3-3H15a.75.75 0 01-.75-.75 1.5 1.5 0 00-1.5-1.5H9a1.5 1.5 0 00-1.5 1.5A.75.75 0 016 9H5.25z" />
                        </svg>

                        <NumericFormat
                          displayType="text"
                          value={tokenBalances[fromToken?.symbol] || 0}
                          decimalScale={4}
                          fixedDecimalScale
                        />
                      </p>
                    </div>
                  </div>
                </div>

                {/* Swap Toggle/Switch Button */}
                <div className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 bg-[#EFF2F5] dark:bg-[#1D2833] p-2 rounded-full border-2 border-white dark:border-[#0D131A] shadow-sm transition-transform w-10 h-10 flex items-center justify-center hover:scale-105">
                  <button
                    onClick={handleSwapTokens}
                    className="w-full h-full flex items-center justify-center"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-5 h-5 dark:text-gray-300"
                    >
                      <path
                        fillRule="evenodd"
                        d="M12 3.75a.75.75 0 01.75.75v13.19l5.47-5.47a.75.75 0 111.06 1.06l-6.75 6.75a.75.75 0 01-1.06 0l-6.75-6.75a.75.75 0 111.06-1.06l5.47 5.47V4.5a.75.75 0 01.75-.75z"
                        clipRule="evenodd"
                        strokeWidth="2"
                      />
                    </svg>
                  </button>
                </div>

                {/* To Token */}
                <div className="rounded-xl bg-[#EFF2F5] font-medium dark:bg-[#1D2833] border border-[#efefef] dark:border-[#28303e] p-3 mb-3">
                  <div className="flex justify-between mb-0 items-center">
                    <div className="gap-4 flex flex-col">
                      <NumericFormat
                        placeholder="0.00"
                        className="w-full border-none font-semibold bg-transparent text-xl focus:outline-none dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={toAmount}
                        onChange={(e) => {
                          const toAmount = e.target.value?.replaceAll(",", "");
                          setToAmount(toAmount);
                          if (Number.isNaN(+toAmount)) {
                            setFromAmount("");
                          } else {
                            const fromAmount =
                              (usdPrice[toToken.symbol] *
                                parseFloat(toAmount)) /
                              usdPrice[fromToken.symbol];
                            setFromAmount(
                              floorFraction(fromAmount, 5)?.toString()
                            );
                          }
                        }}
                        thousandSeparator
                      />
                      <NumericFormat
                        displayType="text"
                        className="text-xs text-[#6D7C8D]"
                        value={parseFloat(toAmount) * toTokenPrice || 0}
                        decimalScale={2}
                        prefix="$"
                      />
                    </div>
                    <div className="flex flex-col gap-4">
                      <div className="relative">
                        <div
                          onClick={() => setShowToDropdown(!showToDropdown)}
                          className="flex items-center gap-2 rounded-lg pl-2 w-auto cursor-pointer"
                        >
                          <img
                            src={toToken?.image}
                            alt={toToken?.symbol}
                            className="h-6 w-6 rounded-full"
                          />
                          <span className="text-sm font-semibold dark:text-white">
                            {toToken?.symbol}
                          </span>
                        </div>
                        {showToDropdown && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="absolute top-full right-0 mt-1 bg-white dark:bg-[#1D2833] rounded-xl shadow-lg border border-[#efefef] dark:border-[#28303e] w-32 z-50 p-1"
                          >
                            {tokenOptions.map((token) => (
                              <div
                                key={token?.symbol}
                                onClick={() => handleTokenSelect(token, false)}
                                className={`flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-[#24313d] cursor-pointer rounded-lg ${
                                  token === fromToken
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                }`}
                              >
                                <img
                                  src={token?.image}
                                  alt={token?.symbol}
                                  className="h-5 w-5 rounded-full"
                                />
                                <span className="text-sm font-semibold dark:text-white">
                                  {token?.symbol}
                                </span>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </div>
                      <p className="text-xs text-[#6D7C8D] flex items-center gap-1 justify-end">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="w-3.5 h-3.5"
                        >
                          <path d="M2.273 5.625A4.483 4.483 0 015.25 4.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0018.75 3H5.25a3 3 0 00-2.977 2.625zM2.273 8.625A4.483 4.483 0 015.25 7.5h13.5c1.141 0 2.183.425 2.977 1.125A3 3 0 0018.75 6H5.25a3 3 0 00-2.977 2.625zM5.25 9a3 3 0 00-3 3v6a3 3 0 003 3h13.5a3 3 0 003-3v-6a3 3 0 00-3-3H15a.75.75 0 01-.75-.75 1.5 1.5 0 00-1.5-1.5H9a1.5 1.5 0 00-1.5 1.5A.75.75 0 016 9H5.25z" />
                        </svg>
                        <NumericFormat
                          displayType="text"
                          value={tokenBalances[toToken?.symbol] || 0}
                          decimalScale={4}
                          fixedDecimalScale
                        />
                      </p>
                    </div>
                  </div>
                </div>

                {/* Swap Button */}
                <button
                  className="w-full py-3 bg-[#10b981e0] text-white font-semibold rounded-full transition-transform hover:scale-105 active:scale-95"
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
                {error && (
                  <div className="text-sm mt-3 font-medium text-red-500 text-center">
                    {error}
                  </div>
                )}
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
  );
};

export default Modal;
