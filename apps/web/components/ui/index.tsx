"use client"

import { clsx } from "clsx"
import type { ReactNode } from "react"

// ── Card ──────────────────────────────────────────────────────────────────

interface CardProps {
  children: ReactNode
  className?: string
  glow?: "cyan" | "purple" | "gold" | "none"
  hover?: boolean
}

export function Card({ children, className, glow = "none", hover = false }: CardProps) {
  return (
    <div
      className={clsx(
        "relative bg-surface-raised border border-surface-border rounded-xl2 p-5 overflow-hidden",
        hover && "transition-all duration-200 hover:border-brand-cyan/30 hover:bg-surface-overlay cursor-pointer",
        glow === "cyan"   && "shadow-[0_0_24px_rgba(0,229,204,0.08)]",
        glow === "purple" && "shadow-[0_0_24px_rgba(123,97,255,0.08)]",
        glow === "gold"   && "shadow-[0_0_24px_rgba(247,147,26,0.08)]",
        className
      )}
    >
      {children}
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────

interface SkeletonProps {
  className?: string
  lines?: number
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={clsx("animate-pulse bg-surface-muted rounded-lg", className)} />
  )
}

export function SkeletonCard() {
  return (
    <Card>
      <Skeleton className="h-3 w-24 mb-4" />
      <Skeleton className="h-8 w-40 mb-2" />
      <Skeleton className="h-3 w-20" />
    </Card>
  )
}

// ── StatBlock ─────────────────────────────────────────────────────────────

interface StatBlockProps {
  label: string
  value: string
  sub?: string
  subPositive?: boolean
  icon?: ReactNode
  iconBg?: string
  loading?: boolean
}

export function StatBlock({ label, value, sub, subPositive = true, icon, iconBg, loading }: StatBlockProps) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <p className="stat-label">{label}</p>
        {loading
          ? <Skeleton className="h-8 w-36 mt-2 mb-1" />
          : <p className="stat-value mt-1">{value}</p>
        }
        {sub && !loading && (
          <p className={clsx("text-xs font-medium mt-1", subPositive ? "text-success" : "text-danger")}>
            {sub}
          </p>
        )}
      </div>
      {icon && (
        <div className={clsx("p-2 rounded-xl shrink-0", iconBg ?? "bg-surface-muted")}>
          {icon}
        </div>
      )}
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────

type BadgeVariant = "low" | "med" | "high" | "critical" | "info" | "neutral"

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
  dot?: boolean
}

export function Badge({ variant = "neutral", children, className, dot }: BadgeProps) {
  const styles: Record<BadgeVariant, string> = {
    low:      "bg-success/10 text-success border-success/20",
    med:      "bg-warning/10 text-warning border-warning/20",
    high:     "bg-danger/10 text-danger border-danger/30",
    critical: "bg-danger/20 text-danger border-danger/40 animate-pulse-slow",
    info:     "bg-info/10 text-info border-info/20",
    neutral:  "bg-surface-muted text-text-secondary border-surface-border",
  }

  return (
    <span className={clsx(
      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border",
      styles[variant],
      className
    )}>
      {dot && (
        <span className={clsx("w-1.5 h-1.5 rounded-full", {
          "bg-success": variant === "low",
          "bg-warning": variant === "med",
          "bg-danger":  variant === "high" || variant === "critical",
          "bg-info":    variant === "info",
          "bg-text-secondary": variant === "neutral",
        })} />
      )}
      {children}
    </span>
  )
}

// ── Divider ───────────────────────────────────────────────────────────────

export function Divider({ className }: { className?: string }) {
  return <div className={clsx("h-px bg-surface-border", className)} />
}

// ── Empty State ───────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description?: string
}

export function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-2xl bg-surface-muted flex items-center justify-center mb-3">
        {icon}
      </div>
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      {description && <p className="text-xs text-text-muted mt-1 max-w-xs">{description}</p>}
    </div>
  )
}

// ── Section Header ────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
  icon?: ReactNode
}

export function SectionHeader({ title, subtitle, action, icon }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-2">
        {icon && <div className="text-text-muted">{icon}</div>}
        <div>
          <h2 className="text-base font-semibold text-text-primary leading-tight">{title}</h2>
          {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

// ── Live Indicator ────────────────────────────────────────────────────────

export function LiveIndicator({ label = "Live" }: { label?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
      </span>
      <span className="text-xs text-success font-medium">{label}</span>
    </div>
  )
}

// ── Trend Arrow ───────────────────────────────────────────────────────────

export function TrendArrow({ value, className }: { value: number; className?: string }) {
  const positive = value >= 0
  return (
    <span className={clsx(
      "text-xs font-semibold tabular-nums",
      positive ? "text-success" : "text-danger",
      className
    )}>
      {positive ? "▲" : "▼"} {Math.abs(value).toFixed(2)}%
    </span>
  )
}

// ── Asset Chip ────────────────────────────────────────────────────────────

const ASSET_META: Record<string, { color: string; bg: string }> = {
  USDY: { color: "#00E5CC", bg: "#00E5CC20" },
  mETH: { color: "#7B61FF", bg: "#7B61FF20" },
  USDe: { color: "#FF6B35", bg: "#FF6B3520" },
  fBTC: { color: "#F7931A", bg: "#F7931A20" },
}

export function AssetChip({ assetId, size = "sm" }: { assetId: string; size?: "xs" | "sm" | "md" }) {
  const meta = ASSET_META[assetId] ?? { color: "#8899BB", bg: "#8899BB20" }
  const sizes = { xs: "w-6 h-6 text-[9px]", sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm" }

  return (
    <div
      className={clsx("rounded-xl flex items-center justify-center font-bold shrink-0", sizes[size])}
      style={{ background: meta.bg, color: meta.color }}
    >
      {assetId.slice(0, 2)}
    </div>
  )
}
