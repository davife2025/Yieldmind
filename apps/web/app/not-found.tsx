import Link from "next/link"
import { Home } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <p className="text-8xl font-black text-gradient-cyan mb-4">404</p>
      <h2 className="text-xl font-bold text-text-primary mb-2">Page not found</h2>
      <p className="text-sm text-text-secondary mb-6">
        The agent looked everywhere but couldn't find this route.
      </p>
      <Link href="/dashboard" className="btn-primary">
        <Home className="w-4 h-4" />
        Back to Dashboard
      </Link>
    </div>
  )
}
