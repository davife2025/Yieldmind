"use client"

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi"
import { defineChain } from "viem"
import { injected } from "wagmi/connectors"

export const mantleTestnet = defineChain({
  id: 5003,
  name: "Mantle Testnet",
  nativeCurrency: { name: "MNT", symbol: "MNT", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.mantle.xyz"] },
  },
  blockExplorers: {
    default: { name: "Mantle Explorer", url: "https://explorer.testnet.mantle.xyz" },
  },
  testnet: true,
})

export function useWallet() {
  const { address, isConnected, chain } = useAccount()
  const { connect, isPending: isConnecting } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain()

  const isOnMantle = chain?.id === mantleTestnet.id
  const shortAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null

  const connectWallet = () => connect({ connector: injected() })

  const ensureMantle = async () => {
    if (!isOnMantle) {
      switchChain({ chainId: mantleTestnet.id })
    }
  }

  return {
    address,
    shortAddress,
    isConnected,
    isConnecting,
    isOnMantle,
    chain,
    connectWallet,
    disconnect,
    ensureMantle,
  }
}
