"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[YieldMind] Error boundary caught:", error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-14 h-14 rounded-2xl bg-danger/10 border border-danger/20 flex items-center justify-center mb-4">
        <AlertTriangle className="w-7 h-7 text-danger" />
      </div>
      <h2 className="text-xl font-bold text-text-primary mb-2">Something went wrong</h2>
      <p className="text-sm text-text-secondary max-w-sm mb-6 leading-relaxed">
        {error.message ?? "An unexpected error occurred. The agent is still running."}
      </p>
      <button onClick={reset} className="btn-primary">
        <RefreshCw className="w-4 h-4" />
        Try again
      </button>
      {error.digest && (
        <p className="text-xs text-text-muted mt-4 font-mono">Error ID: {error.digest}</p>
      )}
    </div>
  )
}
