"use client"

import { useState } from "react"
import { Wallet, ChevronDown, LogOut, ExternalLink, AlertTriangle, Copy, Check } from "lucide-react"
import { useWallet } from "@/hooks/useWallet"
import { clsx } from "clsx"

export function WalletButton() {
  const { address, shortAddress, isConnected, isConnecting, isOnMantle, connectWallet, disconnect, ensureMantle } = useWallet()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  // Not connected
  if (!isConnected) {
    return (
      <button
        onClick={connectWallet}
        disabled={isConnecting}
        className="btn-primary text-xs"
      >
        <Wallet className="w-3.5 h-3.5" />
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </button>
    )
  }

  // Wrong network
  if (!isOnMantle) {
    return (
      <button
        onClick={ensureMantle}
        className="inline-flex items-center gap-2 px-3 py-2 bg-warning/10 border border-warning/30 text-warning text-xs font-semibold rounded-lg hover:bg-warning/20 transition-all"
      >
        <AlertTriangle className="w-3.5 h-3.5" />
        Switch to Mantle
      </button>
    )
  }

  // Connected on Mantle
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 px-3 py-2 bg-surface-overlay border border-surface-border text-xs font-medium rounded-lg hover:border-brand-cyan/30 transition-all"
      >
        <span className="w-2 h-2 rounded-full bg-success" />
        <span className="text-text-primary">{shortAddress}</span>
        <ChevronDown className={clsx("w-3.5 h-3.5 text-text-muted transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-56 bg-surface-overlay border border-surface-border rounded-xl shadow-xl z-40 overflow-hidden animate-slide-up">
            {/* Address */}
            <div className="px-4 py-3 border-b border-surface-border">
              <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Connected</p>
              <p className="text-xs font-mono text-text-primary break-all">{address}</p>
            </div>

            {/* Network */}
            <div className="px-4 py-2.5 border-b border-surface-border flex items-center justify-between">
              <span className="text-xs text-text-muted">Network</span>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                <span className="text-xs font-medium text-text-primary">Mantle Testnet</span>
              </div>
            </div>

            {/* Actions */}
            <div className="p-2 space-y-0.5">
              <button
                onClick={handleCopy}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-text-secondary hover:bg-surface-muted hover:text-text-primary transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Copy address"}
              </button>
              <a
                href={`https://explorer.testnet.mantle.xyz/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-text-secondary hover:bg-surface-muted hover:text-text-primary transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View on Mantle Explorer
              </a>
              <button
                onClick={() => { disconnect(); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-danger hover:bg-danger/10 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                Disconnect
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
