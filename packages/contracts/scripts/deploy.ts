import { ethers, network } from "hardhat"
import * as fs from "fs"
import * as path from "path"

// ─────────────────────────────────────────────────────────────
// YieldMind — Deploy Script
// Deploys AgentIdentity + DecisionLedger to Mantle
// ─────────────────────────────────────────────────────────────

async function main() {
  const [deployer] = await ethers.getSigners()

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("YieldMind — Contract Deployment")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log(`Network:  ${network.name}`)
  console.log(`Deployer: ${deployer.address}`)

  const balance = await ethers.provider.getBalance(deployer.address)
  console.log(`Balance:  ${ethers.formatEther(balance)} MNT`)

  if (balance === 0n) {
    throw new Error("Deployer has no MNT. Fund your wallet from the Mantle testnet faucet.")
  }

  console.log("\n[1/4] Deploying AgentIdentity (ERC-8004)...")
  const AgentIdentity = await ethers.getContractFactory("AgentIdentity")
  const agentIdentity = await AgentIdentity.deploy()
  await agentIdentity.waitForDeployment()
  const agentIdentityAddress = await agentIdentity.getAddress()
  console.log(`      ✓ AgentIdentity deployed at: ${agentIdentityAddress}`)

  console.log("\n[2/4] Deploying DecisionLedger...")
  const DecisionLedger = await ethers.getContractFactory("DecisionLedger")
  const decisionLedger = await DecisionLedger.deploy()
  await decisionLedger.waitForDeployment()
  const decisionLedgerAddress = await decisionLedger.getAddress()
  console.log(`      ✓ DecisionLedger deployed at: ${decisionLedgerAddress}`)

  console.log("\n[3/4] Authorising deployer as recorder...")
  const tx1 = await agentIdentity.setRecorder(deployer.address, true)
  await tx1.wait()
  const tx2 = await decisionLedger.setRecorder(deployer.address, true)
  await tx2.wait()
  console.log(`      ✓ Deployer authorised as recorder on both contracts`)

  console.log("\n[4/4] Saving deployment addresses...")
  const deploymentInfo = {
    network: network.name,
    chainId: network.config.chainId,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      AgentIdentity: {
        address: agentIdentityAddress,
        explorerUrl: getExplorerUrl(network.name, agentIdentityAddress),
      },
      DecisionLedger: {
        address: decisionLedgerAddress,
        explorerUrl: getExplorerUrl(network.name, decisionLedgerAddress),
      },
    },
  }

  // Save to deployments file
  const deploymentsDir = path.join(__dirname, "../deployments")
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir, { recursive: true })

  const outputPath = path.join(deploymentsDir, `${network.name}.json`)
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2))
  console.log(`      ✓ Saved to ${outputPath}`)

  // Print .env lines to add
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("Add these to your .env.local:")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log(`AGENT_IDENTITY_CONTRACT_ADDRESS=${agentIdentityAddress}`)
  console.log(`DECISION_LEDGER_CONTRACT_ADDRESS=${decisionLedgerAddress}`)
  console.log("\n✓ Deployment complete!\n")

  return deploymentInfo
}

function getExplorerUrl(networkName: string, address: string): string {
  const base =
    networkName === "mantle"
      ? "https://explorer.mantle.xyz"
      : "https://explorer.testnet.mantle.xyz"
  return `${base}/address/${address}`
}

main().catch((err) => {
  console.error("Deployment failed:", err)
  process.exit(1)
})
