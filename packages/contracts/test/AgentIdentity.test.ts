import { expect }         from "chai"
import { ethers }         from "hardhat"
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"
import type { BaseContract, ContractTransactionResponse } from "ethers"

// ─────────────────────────────────────────────────────────────
// Contract interface types (mirrors Solidity ABI)
// Avoids `any` without requiring pre-compiled typechain output
// ─────────────────────────────────────────────────────────────

interface AgentProfile {
  name:             string
  mintedAt:         bigint
  decisionsCount:   bigint
  rebalancesCount:  bigint
  totalYieldEarned: bigint
  reputationScore:  bigint
  active:           boolean
}

interface Achievement {
  name:        string
  description: string
  unlockedAt:  bigint
}

interface AgentIdentityContract extends BaseContract {
  mintAgentIdentity(wallet: string, name: string, uri: string): Promise<ContractTransactionResponse>
  recordDecision(tokenId: bigint, decisionType: string, reasoning: string, assetAddress: string, apyDelta: bigint, valueDelta: bigint, onChainExec: boolean, txHash: string): Promise<ContractTransactionResponse>
  setRecorder(recorder: string, authorised: boolean): Promise<ContractTransactionResponse>
  transferFrom(from: string, to: string, tokenId: bigint): Promise<ContractTransactionResponse>
  "safeTransferFrom(address,address,uint256)"(from: string, to: string, tokenId: bigint): Promise<ContractTransactionResponse>
  balanceOf(owner: string): Promise<bigint>
  walletToTokenId(wallet: string): Promise<bigint>
  totalMinted(): Promise<bigint>
  getProfile(tokenId: bigint): Promise<AgentProfile>
  getAchievements(tokenId: bigint): Promise<Achievement[]>
  getDecisions(tokenId: bigint, offset: bigint, limit: bigint): Promise<unknown[]>
}

interface DecisionLedgerContract extends BaseContract {
  setRecorder(recorder: string, authorised: boolean): Promise<ContractTransactionResponse>
  logDecision(agentTokenId: bigint, agentWallet: string, decisionType: string, reasoning: string, assetId: string, apyDeltaBps: bigint, valueDeltaCents: bigint): Promise<ContractTransactionResponse>
  logDecisionBatch(inputs: Array<{ agentTokenId: bigint; agentWallet: string; decisionType: string; reasoning: string; assetId: string; apyDeltaBps: bigint; valueDeltaCents: bigint }>): Promise<ContractTransactionResponse>
  totalDecisions(): Promise<bigint>
  getAgentDecisionCount(wallet: string): Promise<bigint>
  getAgentDecisions(wallet: string, offset: bigint, limit: bigint): Promise<unknown[]>
}

describe("YieldMind Contracts", () => {
  let owner:    SignerWithAddress
  let recorder: SignerWithAddress
  let agent1:   SignerWithAddress
  let agent2:   SignerWithAddress

  let agentIdentity:  AgentIdentityContract
  let decisionLedger: DecisionLedgerContract

  const DECISION_REBALANCE = ethers.keccak256(ethers.toUtf8Bytes("REBALANCE"))
  const DECISION_RISK       = ethers.keccak256(ethers.toUtf8Bytes("RISK"))
  const ASSET_USDY          = ethers.keccak256(ethers.toUtf8Bytes("USDY"))
  const ASSET_METH          = ethers.keccak256(ethers.toUtf8Bytes("mETH"))

  beforeEach(async () => {
    ;[owner, recorder, agent1, agent2] = await ethers.getSigners()

    const AgentIdentityFactory  = await ethers.getContractFactory("AgentIdentity")
    const DecisionLedgerFactory = await ethers.getContractFactory("DecisionLedger")

    agentIdentity  = await AgentIdentityFactory.deploy()  as unknown as AgentIdentityContract
    decisionLedger = await DecisionLedgerFactory.deploy() as unknown as DecisionLedgerContract

    await agentIdentity.setRecorder(recorder.address, true)
    await decisionLedger.setRecorder(recorder.address, true)
  })

  // ── AgentIdentity — Minting ───────────────────────────────────────────

  describe("AgentIdentity — Minting", () => {
    it("mints an identity NFT to an agent wallet", async () => {
      await agentIdentity.connect(recorder).mintAgentIdentity(
        agent1.address, "YieldMind Agent #1", "ipfs://test"
      )
      expect(await agentIdentity.balanceOf(agent1.address)).to.equal(1n)
      expect(await agentIdentity.walletToTokenId(agent1.address)).to.equal(1n)
    })

    it("assigns correct initial profile", async () => {
      await agentIdentity.connect(recorder).mintAgentIdentity(
        agent1.address, "Agent #1", "ipfs://test"
      )
      const profile = await agentIdentity.getProfile(1n)
      expect(profile.name).to.equal("Agent #1")
      expect(profile.decisionsCount).to.equal(0n)
      expect(profile.reputationScore).to.equal(100n)
      expect(profile.active).to.be.true
    })

    it("prevents duplicate minting for same wallet", async () => {
      await agentIdentity.connect(recorder).mintAgentIdentity(
        agent1.address, "Agent #1", "ipfs://test"
      )
      await expect(
        agentIdentity.connect(recorder).mintAgentIdentity(
          agent1.address, "Duplicate", "ipfs://test2"
        )
      ).to.be.revertedWithCustomError(agentIdentity, "AlreadyMinted")
    })

    it("rejects mint from non-recorder", async () => {
      await expect(
        agentIdentity.connect(agent2).mintAgentIdentity(
          agent1.address, "Hack", "ipfs://hack"
        )
      ).to.be.revertedWithCustomError(agentIdentity, "NotAuthorised")
    })

    it("emits AgentMinted event", async () => {
      await expect(
        agentIdentity.connect(recorder).mintAgentIdentity(
          agent1.address, "Agent #1", "ipfs://test"
        )
      ).to.emit(agentIdentity, "AgentMinted")
        .withArgs(1n, agent1.address, "Agent #1")
    })

    it("increments token ID for successive mints", async () => {
      await agentIdentity.connect(recorder).mintAgentIdentity(agent1.address, "A1", "ipfs://1")
      await agentIdentity.connect(recorder).mintAgentIdentity(agent2.address, "A2", "ipfs://2")
      expect(await agentIdentity.totalMinted()).to.equal(2n)
      expect(await agentIdentity.walletToTokenId(agent2.address)).to.equal(2n)
    })
  })

  // ── AgentIdentity — Soul-Binding ──────────────────────────────────────

  describe("AgentIdentity — Soul-Binding", () => {
    it("blocks transfer between wallets", async () => {
      await agentIdentity.connect(recorder).mintAgentIdentity(
        agent1.address, "Agent #1", "ipfs://test"
      )
      await expect(
        agentIdentity.connect(agent1).transferFrom(agent1.address, agent2.address, 1n)
      ).to.be.revertedWithCustomError(agentIdentity, "SoulBound")
    })

    it("blocks safeTransferFrom as well", async () => {
      await agentIdentity.connect(recorder).mintAgentIdentity(
        agent1.address, "Agent #1", "ipfs://test"
      )
      await expect(
        agentIdentity.connect(agent1)["safeTransferFrom(address,address,uint256)"](
          agent1.address, agent2.address, 1n
        )
      ).to.be.revertedWithCustomError(agentIdentity, "SoulBound")
    })
  })

  // ── AgentIdentity — Decision Recording ───────────────────────────────

  describe("AgentIdentity — Decision Recording", () => {
    beforeEach(async () => {
      await agentIdentity.connect(recorder).mintAgentIdentity(
        agent1.address, "Agent #1", "ipfs://test"
      )
    })

    it("records a decision and updates profile", async () => {
      await agentIdentity.connect(recorder).recordDecision(
        1n, DECISION_REBALANCE,
        "Portfolio drifted. Rebalancing USDY to mETH for +0.42% APY.",
        ethers.ZeroAddress, 42n, 62000n, true, ethers.ZeroHash
      )
      const profile = await agentIdentity.getProfile(1n)
      expect(profile.decisionsCount).to.equal(1n)
      expect(profile.rebalancesCount).to.equal(1n)
      expect(profile.totalYieldEarned).to.equal(62000n)
    })

    it("emits DecisionRecorded event", async () => {
      await expect(
        agentIdentity.connect(recorder).recordDecision(
          1n, DECISION_REBALANCE, "Test",
          ethers.ZeroAddress, 10n, 5000n, true, ethers.ZeroHash
        )
      ).to.emit(agentIdentity, "DecisionRecorded")
    })

    it("increments reputation on successful high-value decision", async () => {
      const before = (await agentIdentity.getProfile(1n)).reputationScore
      await agentIdentity.connect(recorder).recordDecision(
        1n, DECISION_REBALANCE, "Good",
        ethers.ZeroAddress, 42n, 100001n, true, ethers.ZeroHash
      )
      const after = (await agentIdentity.getProfile(1n)).reputationScore
      expect(after).to.be.greaterThan(before)
    })

    it("decrements reputation on failed decision", async () => {
      const before = (await agentIdentity.getProfile(1n)).reputationScore
      await agentIdentity.connect(recorder).recordDecision(
        1n, DECISION_RISK, "Failed",
        ethers.ZeroAddress, 0n, 0n, false, ethers.ZeroHash
      )
      const after = (await agentIdentity.getProfile(1n)).reputationScore
      expect(after).to.be.lessThan(before)
    })

    it("unlocks First Decision achievement", async () => {
      await agentIdentity.connect(recorder).recordDecision(
        1n, DECISION_RISK, "Risk mitigation",
        ethers.ZeroAddress, -18n, -7000n, true, ethers.ZeroHash
      )
      const achievements = await agentIdentity.getAchievements(1n)
      expect(achievements.some((a: Achievement) => a.name === "First Decision")).to.be.true
    })

    it("does not duplicate achievements", async () => {
      for (let i = 0; i < 2; i++) {
        await agentIdentity.connect(recorder).recordDecision(
          1n, DECISION_REBALANCE, `D${i}`, ethers.ZeroAddress, 10n, 1000n, true, ethers.ZeroHash
        )
      }
      const achievements = await agentIdentity.getAchievements(1n)
      const count = achievements.filter((a: Achievement) => a.name === "First Decision").length
      expect(count).to.equal(1)
    })

    it("paginates decision log correctly", async () => {
      for (let i = 0; i < 4; i++) {
        await agentIdentity.connect(recorder).recordDecision(
          1n, DECISION_REBALANCE, `D${i}`,
          ethers.ZeroAddress, 10n, 1000n, true, ethers.ZeroHash
        )
      }
      const page = await agentIdentity.getDecisions(1n, 1n, 2n)
      expect(page.length).to.equal(2)
    })
  })

  // ── DecisionLedger ────────────────────────────────────────────────────

  describe("DecisionLedger — Logging", () => {
    it("logs a decision and increments counter", async () => {
      await decisionLedger.connect(recorder).logDecision(
        1n, agent1.address, DECISION_REBALANCE,
        "Shifted 12% USDY to mETH.", ASSET_USDY, 42n, 62000n
      )
      expect(await decisionLedger.totalDecisions()).to.equal(1n)
    })

    it("tracks decisions per agent wallet", async () => {
      await decisionLedger.connect(recorder).logDecision(
        1n, agent1.address, DECISION_REBALANCE, "R1", ASSET_USDY, 42n, 100n
      )
      await decisionLedger.connect(recorder).logDecision(
        1n, agent1.address, DECISION_RISK, "R2", ASSET_METH, -10n, -500n
      )
      expect(await decisionLedger.getAgentDecisionCount(agent1.address)).to.equal(2n)
    })

    it("batch logs atomically", async () => {
      await decisionLedger.connect(recorder).logDecisionBatch([
        { agentTokenId: 1n, agentWallet: agent1.address, decisionType: DECISION_REBALANCE, reasoning: "B1", assetId: ASSET_USDY, apyDeltaBps: 42n,  valueDeltaCents: 100n  },
        { agentTokenId: 1n, agentWallet: agent1.address, decisionType: DECISION_RISK,      reasoning: "B2", assetId: ASSET_METH, apyDeltaBps: -5n,  valueDeltaCents: -200n },
      ])
      expect(await decisionLedger.totalDecisions()).to.equal(2n)
    })

    it("rejects log from non-recorder", async () => {
      await expect(
        decisionLedger.connect(agent2).logDecision(
          1n, agent1.address, DECISION_REBALANCE, "hack", ASSET_USDY, 0n, 0n
        )
      ).to.be.revertedWithCustomError(decisionLedger, "NotAuthorised")
    })

    it("paginates decision history", async () => {
      for (let i = 0; i < 5; i++) {
        await decisionLedger.connect(recorder).logDecision(
          1n, agent1.address, DECISION_REBALANCE, `D${i}`, ASSET_USDY, 10n, 100n
        )
      }
      const page = await decisionLedger.getAgentDecisions(agent1.address, 2n, 2n)
      expect(page.length).to.equal(2)
    })

    it("emits DecisionLogged event", async () => {
      await expect(
        decisionLedger.connect(recorder).logDecision(
          1n, agent1.address, DECISION_REBALANCE,
          "Test reasoning", ASSET_USDY, 42n, 62000n
        )
      ).to.emit(decisionLedger, "DecisionLogged")
    })
  })
})
