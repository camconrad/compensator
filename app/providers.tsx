'use client'

import { useState, useEffect } from 'react'
import { getDefaultConfig, RainbowKitProvider, lightTheme, darkTheme } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { mainnet } from 'wagmi/chains'
import { useSettingTheme } from '@/store/setting/selector'

export const wagmiConfig = getDefaultConfig({
  chains: [mainnet],
  projectId: "02a231b2406ed316c861abefc95c5e59",
  appName: "Compensator",
  ssr: true,
})

const config = wagmiConfig

// Create a new QueryClient instance for each render to prevent hydration issues
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  })
}

function RainbowKitProviderWithTheme({ children }: { children: React.ReactNode }) {
  const theme = useSettingTheme()
  
  // Manage theme classes for Tailwind CSS
  useEffect(() => {
    if (theme === "light") {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    }
  }, [theme])
  
  const rainbowKitTheme = theme === 'dark' 
    ? darkTheme({
        accentColor: '#10B981',
        accentColorForeground: 'white',
        borderRadius: 'large',
        fontStack: 'system',
        overlayBlur: 'small',
      })
    : lightTheme({
        accentColor: '#10B981',
        accentColorForeground: 'white',
        borderRadius: 'large',
        fontStack: 'system',
        overlayBlur: 'small',
      })

  return (
    <RainbowKitProvider theme={rainbowKitTheme}>
      {children}
    </RainbowKitProvider>
  )
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [queryClient] = useState(() => createQueryClient())

  useEffect(() => {
    setMounted(true)
  }, [])

  // Don't render anything until mounted to prevent hydration issues
  if (!mounted) {
    return (
      <div style={{ visibility: 'hidden' }}>
        {children}
      </div>
    )
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProviderWithTheme>
          {children}
        </RainbowKitProviderWithTheme>
      </QueryClientProvider>
    </WagmiProvider>
  )
} 