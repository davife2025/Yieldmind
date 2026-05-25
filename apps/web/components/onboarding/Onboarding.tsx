"use client"

import { useState } from "react"
import { Zap, BrainCircuit, ShieldCheck, Award, ArrowRight, ExternalLink } from "lucide-react"
import { useWallet } from "@/hooks/useWallet"

const STEPS = [
  {
    icon: Zap,
    color: "text-brand-cyan",
    bg: "bg-brand-cyan/10",
    title: "Welcome to YieldMind",
    subtitle: "AI-Powered RWA Yield Intelligence on Mantle",
    body: "YieldMind is an autonomous AI agent that monitors your real-world asset portfolio, detects yield opportunities, and executes rebalancing decisions — all recorded permanently on Mantle.",
  },
  {
    icon: BrainCircuit,
    color: "text-brand-purple",
    bg: "bg-brand-purple/10",
    title: "Meet Your AI Agent",
    subtitle: "Powered by Claude on Anthropic",
    body: "Your agent scans USDY, mETH, USDe, and fBTC positions every 30 minutes. Every decision comes with full AI reasoning — not a black box. You can approve, reject, or let it run autonomously.",
  },
  {
    icon: ShieldCheck,
    color: "text-success",
    bg: "bg-success/10",
    title: "Radical Transparency",
    subtitle: "Every decision on-chain",
    body: "Unlike traditional fund managers, every agent action is recorded on Mantle as an immutable, verifiable event. No hidden decisions. No opaque strategies. Pure accountability.",
  },
  {
    icon: Award,
    color: "text-brand-gold",
    bg: "bg-brand-gold/10",
    title: "ERC-8004 Agent Identity",
    subtitle: "Your agent's on-chain passport",
    body: "Connect your wallet to mint your agent's ERC-8004 Identity NFT — a soul-bound token that tracks every decision, builds reputation, and unlocks achievements as your agent performs.",
  },
]

interface OnboardingProps {
  onComplete: () => void
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0)
  const { connectWallet, isConnected, isConnecting } = useWallet()
  const isLast = step === STEPS.length - 1
  const current = STEPS[step]
  const Icon = current.icon

  const handleNext = async () => {
    if (isLast) {
      if (!isConnected) {
        connectWallet()
      }
      onComplete()
    } else {
      setStep((s) => s + 1)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-base">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-100 pointer-events-none" />
      <div className="absolute inset-0 bg-hero-gradient pointer-events-none" />

      <div className="relative w-full max-w-lg animate-fade-in">
        {/* Logo */}
        <div className="flex items-center gap-2.5 justify-center mb-10">
          <div className="w-9 h-9 rounded-xl bg-brand-cyan flex items-center justify-center">
            <Zap className="w-5 h-5 text-surface-base" strokeWidth={2.5} />
          </div>
          <span className="text-xl font-bold text-text-primary tracking-tight">YieldMind</span>
        </div>

        {/* Card */}
        <div className="bg-surface-raised border border-surface-border rounded-2xl p-8 shadow-2xl">
          {/* Step icon */}
          <div className={`w-14 h-14 rounded-2xl ${current.bg} flex items-center justify-center mb-6 mx-auto`}>
            <Icon className={`w-7 h-7 ${current.color}`} />
          </div>

          {/* Content */}
          <div className="text-center mb-8">
            <p className="text-xs text-text-muted uppercase tracking-widest mb-2">{current.subtitle}</p>
            <h1 className="text-2xl font-bold text-text-primary mb-4">{current.title}</h1>
            <p className="text-sm text-text-secondary leading-relaxed">{current.body}</p>
          </div>

          {/* Step dots */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`rounded-full transition-all duration-200 ${
                  i === step
                    ? "w-6 h-2 bg-brand-cyan"
                    : "w-2 h-2 bg-surface-muted hover:bg-surface-border"
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button onClick={handleNext} disabled={isConnecting} className="btn-primary w-full justify-center py-3 text-sm">
              {isLast
                ? isConnecting
                  ? "Connecting wallet..."
                  : isConnected ? "Enter Dashboard" : "Connect Wallet & Enter"
                : "Continue"
              }
              <ArrowRight className="w-4 h-4" />
            </button>

            {!isLast && (
              <button onClick={onComplete} className="btn-ghost w-full justify-center text-xs text-text-muted">
                Skip intro
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-4 mt-6 text-xs text-text-muted">
          <a
            href="https://dorahacks.io/hackathon/mantleturingtesthackathon2026/detail"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-brand-cyan transition-colors"
          >
            The Turing Test Hackathon <ExternalLink className="w-3 h-3" />
          </a>
          <span>·</span>
          <a href="https://mantle.xyz" target="_blank" rel="noopener noreferrer"
            className="hover:text-brand-cyan transition-colors">
            Built on Mantle
          </a>
        </div>
      </div>
    </div>
  )
}
