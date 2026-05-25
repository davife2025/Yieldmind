import { expect } from "chai"
import { ethers } from "hardhat"
import type { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers"
import type { AgentIdentity, DecisionLedger } from "../typechain-types"

describe("YieldMind Contracts", () => {
  let owner: SignerWithAddress
  let recorder: SignerWithAddress
  let agent1: SignerWithAddress
  let agent2: SignerWithAddress

  let agentIdentity: AgentIdentity
  let decisionLedger: DecisionLedger

  const DECISION_REBALANCE = ethers.keccak256(ethers.toUtf8Bytes("REBALANCE"))
  const DECISION_RISK       = ethers.keccak256(ethers.toUtf8Bytes("RISK"))
  const ASSET_USDY          = ethers.keccak256(ethers.toUtf8Bytes("USDY"))
  const ASSET_METH          = ethers.keccak256(ethers.toUtf8Bytes("mETH"))

  beforeEach(async () => {
    ;[owner, recorder, agent1, agent2] = await ethers.getSigners()

    // Deploy contracts
    const AgentIdentityFactory  = await ethers.getContractFactory("AgentIdentity")
    const DecisionLedgerFactory = await ethers.getContractFactory("DecisionLedger")

    agentIdentity  = await AgentIdentityFactory.deploy()
    decisionLedger = await DecisionLedgerFactory.deploy()

    // Authorise recorder
    await agentIdentity.setRecorder(recorder.address, true)
    await decisionLedger.setRecorder(recorder.address, true)
  })

  // ── AgentIdentity ────────────────────────────────────────────────────────

  describe("AgentIdentity — Minting", () => {
    it("mints an identity NFT to an agent wallet", async () => {
      await agentIdentity.connect(recorder).mintAgentIdentity(
        agent1.address,
        "YieldMind Agent #1",
        "ipfs://Qm.../1.json"
      )
      expect(await agentIdentity.balanceOf(agent1.address)).to.equal(1)
      expect(await agentIdentity.walletToTokenId(agent1.address)).to.equal(1)
    })

    it("assigns correct initial profile", async () => {
      await agentIdentity.connect(recorder).mintAgentIdentity(
        agent1.address, "Agent #1", "ipfs://test"
      )
      const profile = await agentIdentity.getProfile(1)
      expect(profile.name).to.equal("Agent #1")
      expect(profile.decisionsCount).to.equal(0)
      expect(profile.reputationScore).to.equal(100)
      expect(profile.active).to.be.true
    })

    it("prevents duplicate minting for same wallet", async () => {
      await agentIdentity.connect(recorder).mintAgentIdentity(
        agent1.address, "Agent #1", "ipfs://test"
      )
      await expect(
        agentIdentity.connect(recorder).mintAgentIdentity(
          agent1.address, "Agent #1 dupe", "ipfs://test2"
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
        .withArgs(1, agent1.address, "Agent #1")
    })
  })

  describe("AgentIdentity — Soul-Binding", () => {
    it("blocks transfer between wallets (soul-bound)", async () => {
      await agentIdentity.connect(recorder).mintAgentIdentity(
        agent1.address, "Agent #1", "ipfs://test"
      )
      await expect(
        agentIdentity.connect(agent1).transferFrom(agent1.address, agent2.address, 1)
      ).to.be.revertedWithCustomError(agentIdentity, "SoulBound")
    })
  })

  describe("AgentIdentity — Decision Recording", () => {
    beforeEach(async () => {
      await agentIdentity.connect(recorder).mintAgentIdentity(
        agent1.address, "Agent #1", "ipfs://test"
      )
    })

    it("records a decision and updates profile", async () => {
      await agentIdentity.connect(recorder).recordDecision(
        1,
        DECISION_REBALANCE,
        "Portfolio drifted. Rebalancing USDY to mETH for +0.42% APY.",
        ethers.ZeroAddress,
        42,    // +0.42% APY in bps
        62000, // +$620.00 in cents
        true,
        ethers.ZeroHash
      )

      const profile = await agentIdentity.getProfile(1)
      expect(profile.decisionsCount).to.equal(1)
      expect(profile.rebalancesCount).to.equal(1)
      expect(profile.totalYieldEarned).to.equal(62000)
    })

    it("emits DecisionRecorded event", async () => {
      await expect(
        agentIdentity.connect(recorder).recordDecision(
          1, DECISION_REBALANCE, "Test reasoning",
          ethers.ZeroAddress, 10, 5000, true, ethers.ZeroHash
        )
      ).to.emit(agentIdentity, "DecisionRecorded")
    })

    it("increments reputation on successful decision", async () => {
      const before = (await agentIdentity.getProfile(1)).reputationScore
      await agentIdentity.connect(recorder).recordDecision(
        1, DECISION_REBALANCE, "Good decision",
        ethers.ZeroAddress, 42, 100000, true, ethers.ZeroHash
      )
      const after = (await agentIdentity.getProfile(1)).reputationScore
      expect(after).to.be.gt(before)
    })

    it("unlocks First Decision achievement", async () => {
      await agentIdentity.connect(recorder).recordDecision(
        1, DECISION_RISK, "Risk mitigation",
        ethers.ZeroAddress, -18, -7000, true, ethers.ZeroHash
      )
      const achievements = await agentIdentity.getAchievements(1)
      expect(achievements.some((a) => a.name === "First Decision")).to.be.true
    })

    it("retrieves decision log with pagination", async () => {
      // Write 3 decisions
      for (let i = 0; i < 3; i++) {
        await agentIdentity.connect(recorder).recordDecision(
          1, DECISION_REBALANCE, `Decision ${i}`,
          ethers.ZeroAddress, 10, 1000, true, ethers.ZeroHash
        )
      }
      const page = await agentIdentity.getDecisions(1, 0, 2)
      expect(page.length).to.equal(2)
    })
  })

  // ── DecisionLedger ────────────────────────────────────────────────────────

  describe("DecisionLedger — Logging", () => {
    it("logs a decision and increments counter", async () => {
      await decisionLedger.connect(recorder).logDecision(
        1,
        agent1.address,
        DECISION_REBALANCE,
        "Shifted 12% USDY to mETH for yield optimisation.",
        ASSET_USDY,
        42,
        62000
      )
      expect(await decisionLedger.totalDecisions()).to.equal(1)
    })

    it("emits DecisionLogged event with correct data", async () => {
      await expect(
        decisionLedger.connect(recorder).logDecision(
          1, agent1.address, DECISION_REBALANCE,
          "Test reasoning", ASSET_USDY, 42, 62000
        )
      ).to.emit(decisionLedger, "DecisionLogged")
        .withArgs(1, 1, agent1.address, DECISION_REBALANCE, ASSET_USDY, 42, 62000, await getTimestamp())
    })

    it("tracks decisions per agent wallet", async () => {
      await decisionLedger.connect(recorder).logDecision(
        1, agent1.address, DECISION_REBALANCE, "R1", ASSET_USDY, 42, 100
      )
      await decisionLedger.connect(recorder).logDecision(
        1, agent1.address, DECISION_RISK, "R2", ASSET_METH, -10, -500
      )
      expect(await decisionLedger.getAgentDecisionCount(agent1.address)).to.equal(2)
    })

    it("batch logs multiple decisions atomically", async () => {
      await decisionLedger.connect(recorder).logDecisionBatch([
        { agentTokenId: 1, agentWallet: agent1.address, decisionType: DECISION_REBALANCE, reasoning: "B1", assetId: ASSET_USDY, apyDeltaBps: 42, valueDeltaCents: 100 },
        { agentTokenId: 1, agentWallet: agent1.address, decisionType: DECISION_RISK,      reasoning: "B2", assetId: ASSET_METH, apyDeltaBps: -5,  valueDeltaCents: -200 },
      ])
      expect(await decisionLedger.totalDecisions()).to.equal(2)
    })

    it("rejects log from non-recorder", async () => {
      await expect(
        decisionLedger.connect(agent2).logDecision(
          1, agent1.address, DECISION_REBALANCE, "hack", ASSET_USDY, 0, 0
        )
      ).to.be.revertedWithCustomError(decisionLedger, "NotAuthorised")
    })

    it("paginates agent decision history", async () => {
      for (let i = 0; i < 5; i++) {
        await decisionLedger.connect(recorder).logDecision(
          1, agent1.address, DECISION_REBALANCE, `D${i}`, ASSET_USDY, 10, 100
        )
      }
      const page = await decisionLedger.getAgentDecisions(agent1.address, 2, 2)
      expect(page.length).to.equal(2)
    })
  })
})

// ── Helpers ───────────────────────────────────────────────────────────────

async function getTimestamp(): Promise<number> {
  const block = await ethers.provider.getBlock("latest")
  return block!.timestamp + 1 // Approximate next block
}
