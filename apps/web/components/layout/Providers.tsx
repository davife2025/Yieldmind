"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { WagmiProvider, createConfig, http } from "wagmi"
import { defineChain } from "viem"
import { injected } from "wagmi/connectors"
import { useState } from "react"
import { OnboardingGate } from "@/components/onboarding/OnboardingGate"

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
  connectors: [injected()],
  transports: { [mantleTestnet.id]: http() },
})

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: { staleTime: 30_000, refetchOnWindowFocus: false },
      },
    })
  )

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <OnboardingGate>
          {children}
        </OnboardingGate>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
