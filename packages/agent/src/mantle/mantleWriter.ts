import { ethers } from "ethers"
import type { AgentDecisionPayload } from "../types"

// ─────────────────────────────────────────────────────────────
// YieldMind — Mantle On-Chain Writer
// Mints ERC-8004 NFTs and logs decisions to DecisionLedger
// ─────────────────────────────────────────────────────────────

// Minimal ABIs (only functions we call)
const AGENT_IDENTITY_ABI = [
  "function mintAgentIdentity(address wallet, string name, string uri) external returns (uint256)",
  "function recordDecision(uint256 tokenId, bytes32 decisionType, string reasoning, address assetAddress, int256 apyDelta, int256 valueDelta, bool onChainExec, bytes32 txHash) external",
  "function getTokenByWallet(address wallet) external view returns (uint256)",
  "function getProfile(uint256 tokenId) external view returns (tuple(string name, uint256 mintedAt, uint256 decisionsCount, uint256 rebalancesCount, uint256 totalYieldEarned, uint256 reputationScore, bool active))",
]

const DECISION_LEDGER_ABI = [
  "function logDecision(uint256 agentTokenId, address agentWallet, bytes32 decisionType, string reasoning, bytes32 assetId, int256 apyDeltaBps, int256 valueDeltaCents) external returns (uint256)",
  "function logDecisionBatch(tuple(uint256 agentTokenId, address agentWallet, bytes32 decisionType, string reasoning, bytes32 assetId, int256 apyDeltaBps, int256 valueDeltaCents)[] inputs) external returns (uint256[])",
  "function totalDecisions() external view returns (uint256)",
]

// ── Client ────────────────────────────────────────────────────────────────

export class MantleWriter {
  private provider: ethers.JsonRpcProvider
  private signer: ethers.Wallet
  private agentIdentity: ethers.Contract
  private decisionLedger: ethers.Contract

  constructor() {
    const rpcUrl = process.env.NEXT_PUBLIC_MANTLE_RPC_URL ?? "https://rpc.testnet.mantle.xyz"
    const privateKey = process.env.DEPLOYER_PRIVATE_KEY

    if (!privateKey) {
      throw new Error("DEPLOYER_PRIVATE_KEY not set — required for on-chain writes")
    }

    const agentIdentityAddress = process.env.AGENT_IDENTITY_CONTRACT_ADDRESS
    const decisionLedgerAddress = process.env.DECISION_LEDGER_CONTRACT_ADDRESS

    if (!agentIdentityAddress || !decisionLedgerAddress) {
      throw new Error("Contract addresses not set. Run: pnpm deploy:testnet first")
    }

    this.provider = new ethers.JsonRpcProvider(rpcUrl)
    this.signer   = new ethers.Wallet(privateKey, this.provider)

    this.agentIdentity  = new ethers.Contract(agentIdentityAddress,  AGENT_IDENTITY_ABI,  this.signer)
    this.decisionLedger = new ethers.Contract(decisionLedgerAddress, DECISION_LEDGER_ABI, this.signer)
  }

  // ── Mint ERC-8004 Agent Identity NFT ────────────────────────────────────

  async mintAgentIdentity(
    walletAddress: string,
    agentName: string,
    metadataUri: string = ""
  ): Promise<{ tokenId: string; txHash: string }> {
    console.log(`[Mantle] Minting ERC-8004 NFT for ${walletAddress}...`)

    // Build metadata URI if not provided
    const uri = metadataUri || buildDefaultMetadataUri(agentName)

    const tx = await this.agentIdentity.mintAgentIdentity(walletAddress, agentName, uri)
    const receipt = await tx.wait()

    // Parse token ID from event
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = this.agentIdentity.interface.parseLog(log)
        return parsed?.name === "AgentMinted"
      } catch { return false }
    })

    const parsed = event ? this.agentIdentity.interface.parseLog(event) : null
    const tokenId = parsed?.args[0]?.toString() ?? "1"

    console.log(`[Mantle] ✓ Minted token #${tokenId} | tx: ${receipt.hash}`)

    return { tokenId, txHash: receipt.hash }
  }

  // ── Log a single decision to DecisionLedger ───────────────────────────

  async logDecision(
    payload: AgentDecisionPayload,
    agentTokenId: string,
    walletAddress: string
  ): Promise<string> {
    const decisionTypeHash = ethers.keccak256(ethers.toUtf8Bytes(payload.type))
    const assetIdHash = payload.assetId
      ? ethers.keccak256(ethers.toUtf8Bytes(payload.assetId))
      : ethers.ZeroHash

    const apyDeltaBps     = Math.round((payload.apyDelta ?? 0) * 100)
    const valueDeltaCents = Math.round((payload.valueDeltaUsd ?? 0) * 100)

    const tx = await this.decisionLedger.logDecision(
      agentTokenId,
      walletAddress,
      decisionTypeHash,
      payload.reasoning,
      assetIdHash,
      apyDeltaBps,
      valueDeltaCents
    )
    const receipt = await tx.wait()

    console.log(`[Mantle] ✓ Decision logged on-chain | tx: ${receipt.hash}`)
    return receipt.hash
  }

  // ── Batch log decisions (gas optimised) ──────────────────────────────

  async logDecisionBatch(
    payloads: AgentDecisionPayload[],
    agentTokenId: string,
    walletAddress: string
  ): Promise<string> {
    const inputs = payloads.map((p) => ({
      agentTokenId,
      agentWallet: walletAddress,
      decisionType: ethers.keccak256(ethers.toUtf8Bytes(p.type)),
      reasoning: p.reasoning,
      assetId: p.assetId
        ? ethers.keccak256(ethers.toUtf8Bytes(p.assetId))
        : ethers.ZeroHash,
      apyDeltaBps: Math.round((p.apyDelta ?? 0) * 100),
      valueDeltaCents: Math.round((p.valueDeltaUsd ?? 0) * 100),
    }))

    const tx = await this.decisionLedger.logDecisionBatch(inputs)
    const receipt = await tx.wait()

    console.log(`[Mantle] ✓ Batch of ${payloads.length} decisions logged | tx: ${receipt.hash}`)
    return receipt.hash
  }

  // ── Read: get token ID for wallet ─────────────────────────────────────

  async getTokenId(walletAddress: string): Promise<string | null> {
    try {
      const tokenId = await this.agentIdentity.getTokenByWallet(walletAddress)
      return tokenId.toString() === "0" ? null : tokenId.toString()
    } catch {
      return null
    }
  }

  // ── Read: get on-chain profile ────────────────────────────────────────

  async getOnChainProfile(tokenId: string) {
    try {
      return await this.agentIdentity.getProfile(tokenId)
    } catch {
      return null
    }
  }

  // ── Read: total on-chain decisions ────────────────────────────────────

  async getTotalOnChainDecisions(): Promise<number> {
    try {
      const total = await this.decisionLedger.totalDecisions()
      return Number(total)
    } catch {
      return 0
    }
  }
}

// ── Metadata URI builder (for when IPFS is not set up) ────────────────────

function buildDefaultMetadataUri(agentName: string): string {
  // Produces a data URI with basic metadata
  // In production, upload to IPFS and use the CID
  const metadata = {
    name: agentName,
    description: "YieldMind AI Agent Identity — ERC-8004",
    image: "https://yieldmind.xyz/agent-default.png",
    attributes: [
      { trait_type: "Protocol", value: "YieldMind" },
      { trait_type: "Network", value: "Mantle" },
      { trait_type: "Standard", value: "ERC-8004" },
    ],
  }
  return `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString("base64")}`
}

// ── Singleton ─────────────────────────────────────────────────────────────

let _mantleWriter: MantleWriter | null = null

export function getMantleWriter(): MantleWriter {
  if (!_mantleWriter) _mantleWriter = new MantleWriter()
  return _mantleWriter
}
