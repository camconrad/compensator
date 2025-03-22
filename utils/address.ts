export const truncateAddress = (address: string | null | undefined, startChars = 6, endChars = 4): string => {
    if (!address) return "Connect Wallet"
    return `${address.substring(0, startChars)}..${address.substring(address.length - endChars)}`
  }
  
  