import { ethers } from "ethers";
import BigNumber from "bignumber.js";
import axios from "axios";

export const formatTokenAmount = (
  amount: string,
  tokenDecimals: number,
  displayDecimals: number
): string => {
  // Format it as a number
  let result = Number(ethers.formatUnits(amount, tokenDecimals));
  // Floor it with rounding
  result =
    Math.floor(result * Math.pow(10, displayDecimals)) /
    Math.pow(10, displayDecimals);

  if (result === 0 && Number(amount) != 0) {
    // Recursively call this function with one more decimal place
    return formatTokenAmount(amount, tokenDecimals, displayDecimals + 1);
  }

  return result.toFixed(displayDecimals);
};

export const floorFraction = (number: number, fraction = 0) => {
  return Number(
    new BigNumber(number)
      .multipliedBy(Math.pow(10, fraction))
      .dividedToIntegerBy(1)
      .dividedBy(Math.pow(10, fraction))
      .toString()
  );
};

export const getPriceToken = async (symbol: string) => {
  try {
    const pairSymbol =
      symbol.toUpperCase() === "USDT"
        ? "USDCUSDT"
        : `${symbol.toUpperCase()}USDT`;
    const data = await axios.get(
      `https://api.binance.us/api/v3/ticker/price?symbol=${pairSymbol}`
    );
    return Number(data?.data?.price) || 0;
  } catch (error) {
    console.error(`Failed to fetch price for ${symbol}:`, error);
    return 0;
  }
};
