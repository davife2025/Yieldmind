// Auto-generated types for YieldMind Supabase schema
// Run: pnpm db:types to regenerate from live schema

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type AssetId = "USDY" | "mETH" | "USDe" | "fBTC"
export type RiskLevel = "LOW" | "MED" | "HIGH"
export type DecisionType = "REBALANCE" | "YIELD" | "RISK" | "ALERT" | "INFO"
export type DecisionStatus = "pending" | "confirmed" | "failed" | "skipped"
export type AlertSeverity = "LOW" | "MED" | "HIGH" | "CRITICAL"

export interface Database {
  public: {
    Tables: {
      agents: {
        Row: {
          id: string
          wallet_address: string
          nft_token_id: string | null
          name: string
          avatar_url: string | null
          total_value_usd: number
          weighted_apy: number
          decisions_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          wallet_address: string
          nft_token_id?: string | null
          name: string
          avatar_url?: string | null
          total_value_usd?: number
          weighted_apy?: number
          decisions_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["agents"]["Insert"]>
      }

      positions: {
        Row: {
          id: string
          agent_id: string
          asset_id: AssetId
          balance: number
          value_usd: number
          allocation_pct: number
          target_allocation_pct: number
          updated_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          asset_id: AssetId
          balance: number
          value_usd: number
          allocation_pct: number
          target_allocation_pct: number
          updated_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["positions"]["Insert"]>
      }

      agent_decisions: {
        Row: {
          id: string
          agent_id: string
          type: DecisionType
          reasoning: string
          action_taken: string | null
          tx_hash: string | null
          status: DecisionStatus
          asset_id: AssetId | null
          value_delta_usd: number | null
          apy_delta: number | null
          created_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          type: DecisionType
          reasoning: string
          action_taken?: string | null
          tx_hash?: string | null
          status?: DecisionStatus
          asset_id?: AssetId | null
          value_delta_usd?: number | null
          apy_delta?: number | null
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["agent_decisions"]["Insert"]>
      }

      yield_snapshots: {
        Row: {
          id: string
          asset_id: AssetId
          apy: number
          price_usd: number
          tvl_usd: number | null
          source: string
          timestamp: string
        }
        Insert: {
          id?: string
          asset_id: AssetId
          apy: number
          price_usd: number
          tvl_usd?: number | null
          source: string
          timestamp?: string
        }
        Update: Partial<Database["public"]["Tables"]["yield_snapshots"]["Insert"]>
      }

      risk_alerts: {
        Row: {
          id: string
          agent_id: string
          asset_id: AssetId | null
          severity: AlertSeverity
          title: string
          message: string
          resolved: boolean
          resolved_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          agent_id: string
          asset_id?: AssetId | null
          severity: AlertSeverity
          title: string
          message: string
          resolved?: boolean
          resolved_at?: string | null
          created_at?: string
        }
        Update: Partial<Database["public"]["Tables"]["risk_alerts"]["Insert"]>
      }
    }
  }
}

// Convenience row types
export type Agent = Database["public"]["Tables"]["agents"]["Row"]
export type Position = Database["public"]["Tables"]["positions"]["Row"]
export type AgentDecision = Database["public"]["Tables"]["agent_decisions"]["Row"]
export type YieldSnapshot = Database["public"]["Tables"]["yield_snapshots"]["Row"]
export type RiskAlert = Database["public"]["Tables"]["risk_alerts"]["Row"]
