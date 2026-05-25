import type { Metadata } from "next"
import "./globals.css"
import { Providers } from "@/components/layout/Providers"
import { Sidebar } from "@/components/layout/Sidebar"
import { TopBar } from "@/components/layout/TopBar"

export const metadata: Metadata = {
  title: { default: "YieldMind", template: "%s | YieldMind" },
  description: "AI-Powered RWA Yield Intelligence on Mantle. Real assets. Autonomous yield. On-chain proof.",
  keywords: ["DeFi", "RWA", "Mantle", "AI Agent", "Yield", "USDY", "mETH"],
  themeColor: "#080C14",
  openGraph: {
    title: "YieldMind",
    description: "Real assets. Autonomous yield. On-chain proof.",
    type: "website",
    siteName: "YieldMind",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-surface-base text-text-primary antialiased">
        <Providers>
          <div className="flex h-screen overflow-hidden">
            {/* Sidebar */}
            <Sidebar />

            {/* Main content */}
            <div className="flex flex-col flex-1 overflow-hidden">
              <TopBar />
              <main className="flex-1 overflow-y-auto bg-surface-base">
                {/* Background grid */}
                <div
                  className="fixed inset-0 bg-grid-pattern bg-grid opacity-100 pointer-events-none"
                  aria-hidden="true"
                />
                {/* Hero gradient */}
                <div
                  className="fixed inset-0 bg-hero-gradient pointer-events-none"
                  aria-hidden="true"
                />
                <div className="relative z-10 p-6">
                  {children}
                </div>
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  )
}
