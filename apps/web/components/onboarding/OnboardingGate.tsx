"use client"

import { useState, useEffect } from "react"
import { Onboarding } from "@/components/onboarding/Onboarding"

const STORAGE_KEY = "yieldmind_onboarded"

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY)
    setShowOnboarding(!seen)
    setReady(true)
  }, [])

  const handleComplete = () => {
    localStorage.setItem(STORAGE_KEY, "1")
    setShowOnboarding(false)
  }

  if (!ready) return null

  return (
    <>
      {showOnboarding && <Onboarding onComplete={handleComplete} />}
      {children}
    </>
  )
}
