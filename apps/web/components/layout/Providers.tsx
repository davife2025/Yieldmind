"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { WagmiProvider, createConfig, http } from "wagmi"
import { defineChain } from "viem"
import { useState } from "react"

const mantleTestnet = defineChain({
  id: 5003,
  name: "Mantle Testnet",
  nativeCurrency: { name: "MNT", symbol: "MNT", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_MANTLE_RPC_URL ?? "https://rpc.testnet.mantle.xyz"] },
  },
  blockExplorers: {
    default: { name: "Mantle Explorer", url: "https://explorer.testnet.mantle.xyz" },
  },
  testnet: true,
})

const wagmiConfig = createConfig({
  chains: [mantleTestnet],
  transports: { [mantleTestnet.id]: http() },
})

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
