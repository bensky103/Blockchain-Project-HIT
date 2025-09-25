#!/usr/bin/env ts-node

import { ethers } from "hardhat";
import { Contract } from "ethers";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

interface DeploymentData {
  network: string;
  chainId: string;
  deployer: string;
  timestamp: string;
  contracts: {
    balToken: {
      address: string;
      txHash: string;
    };
    election: {
      address: string;
      txHash: string;
    };
  };
  configuration: {
    voteReward: string;
    electionStartTime: number;
    electionEndTime: number;
    merkleRoot?: string;
  };
  transactions: {
    minterSetup: string;
    electionCreation?: string;
    merkleRootUpdate?: string;
  };
}

async function main(): Promise<void> {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("🚀 Starting complete deployment process...");
  console.log("==========================================");
  console.log("Network:", network.name);
  console.log("Chain ID:", network.chainId.toString());
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  console.log("");

  // Environment variables
  const voteReward = process.env.VOTE_REWARD || "1000000000000000000"; // 1 BAL
  const startDelay = parseInt(process.env.ELECTION_START_DELAY || "3900"); // 1 hour 5 minutes for safety
  const duration = parseInt(process.env.ELECTION_DURATION || "86400"); // 24 hours
  const electionName = process.env.ELECTION_NAME || "Test Election 2025";
  const electionDescription = process.env.ELECTION_DESCRIPTION || "A test election for the Elections 2025 DApp";

  console.log("📋 Configuration:");
  console.log("- Vote Reward:", ethers.formatEther(voteReward), "BAL");
  console.log("- Start Delay:", startDelay, "seconds");
  console.log("- Duration:", duration, "seconds");
  console.log("- Election Name:", electionName);
  console.log("");

  const deploymentData: DeploymentData = {
    network: network.name,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      balToken: { address: "", txHash: "" },
      election: { address: "", txHash: "" }
    },
    configuration: {
      voteReward,
      electionStartTime: 0,
      electionEndTime: 0
    },
    transactions: {
      minterSetup: ""
    }
  };

  try {
    // Step 1: Deploy BalToken
    console.log("📄 Step 1: Deploying BalToken...");
    const BalToken = await ethers.getContractFactory("BalToken");
    const balToken = await BalToken.deploy(deployer.address);
    await balToken.waitForDeployment();

    deploymentData.contracts.balToken.address = await balToken.getAddress();
    deploymentData.contracts.balToken.txHash = balToken.deploymentTransaction()?.hash || "";

    console.log("✅ BalToken deployed to:", deploymentData.contracts.balToken.address);
    console.log("   Transaction:", deploymentData.contracts.balToken.txHash);
    console.log("");

    // Step 2: Deploy Election
    console.log("📄 Step 2: Deploying Election...");
    const Election = await ethers.getContractFactory("Election");
    const election = await Election.deploy(deploymentData.contracts.balToken.address, deployer.address);
    await election.waitForDeployment();

    deploymentData.contracts.election.address = await election.getAddress();
    deploymentData.contracts.election.txHash = election.deploymentTransaction()?.hash || "";

    console.log("✅ Election deployed to:", deploymentData.contracts.election.address);
    console.log("   Transaction:", deploymentData.contracts.election.txHash);
    console.log("");

    // Step 3: Set Election as minter
    console.log("📄 Step 3: Setting Election as BAL token minter...");
    const addMinterTx = await balToken.addMinter(deploymentData.contracts.election.address);
    await addMinterTx.wait();
    deploymentData.transactions.minterSetup = addMinterTx.hash;

    console.log("✅ Election contract added as BAL token minter");
    console.log("   Transaction:", addMinterTx.hash);
    console.log("");

    // Step 4: Set initial vote reward
    console.log("📄 Step 4: Setting initial vote reward...");
    const setRewardTx = await election.setReward(voteReward);
    await setRewardTx.wait();

    console.log("✅ Vote reward set to:", ethers.formatEther(voteReward), "BAL");
    console.log("   Transaction:", setRewardTx.hash);
    console.log("");

    // Step 5: Check for existing Merkle tree first
    console.log("📄 Step 5: Checking for Merkle tree...");
    const merkleTreePath = path.resolve("tools/out/merkle.json");
    let merkleRoot = "0x0000000000000000000000000000000000000000000000000000000000000001"; // Non-zero default

    if (fs.existsSync(merkleTreePath)) {
      const merkleData = JSON.parse(fs.readFileSync(merkleTreePath, "utf-8"));
      merkleRoot = merkleData.root;
      deploymentData.configuration.merkleRoot = merkleRoot;
      console.log("✅ Found existing Merkle tree with root:", merkleRoot);
      console.log("   Eligible voters:", Object.keys(merkleData.proofs).length);
    } else {
      console.log("⚠️  No Merkle tree found, using placeholder root");
      console.log("   Run 'npm run merkle:build' to generate voter proofs");
    }
    console.log("");

    // Step 6: Create election with timing
    console.log("📄 Step 6: Creating election...");
    const currentTime = Math.floor(Date.now() / 1000);
    const startTime = currentTime + startDelay;
    const endTime = startTime + duration;

    deploymentData.configuration.electionStartTime = startTime;
    deploymentData.configuration.electionEndTime = endTime;

    const createElectionTx = await election.createElection(
      electionName,
      electionDescription,
      startTime,
      endTime,
      merkleRoot,
      true // Enable questionnaire functionality
    );
    await createElectionTx.wait();
    deploymentData.transactions.electionCreation = createElectionTx.hash;

    console.log("✅ Election created:");
    console.log("   Name:", electionName);
    console.log("   Start:", new Date(startTime * 1000).toLocaleString());
    console.log("   End:", new Date(endTime * 1000).toLocaleString());
    console.log("   Merkle Root:", merkleRoot);
    console.log("   Questionnaire Enabled: true");
    console.log("   Transaction:", createElectionTx.hash);
    console.log("");

    // Step 7: Save deployment data
    console.log("📄 Step 7: Saving deployment data...");
    const deploymentDir = path.resolve("deployments");
    if (!fs.existsSync(deploymentDir)) {
      fs.mkdirSync(deploymentDir, { recursive: true });
    }

    const deploymentFile = path.join(deploymentDir, `${network.name}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));

    console.log("✅ Deployment data saved to:", deploymentFile);
    console.log("");

    // Final summary
    console.log("🎉 DEPLOYMENT COMPLETE!");
    console.log("=======================");
    console.log("Network:", network.name);
    console.log("BAL Token:", deploymentData.contracts.balToken.address);
    console.log("Election:", deploymentData.contracts.election.address);
    console.log("Deployment file:", deploymentFile);
    console.log("");

    console.log("🎯 Next Steps:");
    if (merkleRoot === "0x0000000000000000000000000000000000000000000000000000000000000001") {
      console.log("1. Generate voter Merkle tree: npm run merkle:build");
      console.log("2. Update Merkle root in contract");
      console.log("3. Add candidates to the election");
    } else {
      console.log("1. Add candidates to the election");
    }
    console.log("2. Wait for election start time");
    console.log("3. Begin voting!");
    console.log("");

    console.log("🔗 Useful commands:");
    console.log("- Add candidate: await election.addCandidate(\"Name\", \"Description\", [1,2,3])");
    console.log("- Check election: await election.elections(0)");
    console.log(`- Get BAL balance: await balToken.balanceOf("${deployer.address}")`);

  } catch (error) {
    console.error("❌ Deployment failed:", error);

    // Save partial deployment data for debugging
    if (deploymentData.contracts.balToken.address || deploymentData.contracts.election.address) {
      const deploymentDir = path.resolve("deployments");
      if (!fs.existsSync(deploymentDir)) {
        fs.mkdirSync(deploymentDir, { recursive: true });
      }
      const failedDeploymentFile = path.join(deploymentDir, `${network.name}-failed.json`);
      fs.writeFileSync(failedDeploymentFile, JSON.stringify(deploymentData, null, 2));
      console.log("💾 Partial deployment data saved to:", failedDeploymentFile);
    }

    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Script execution failed:", error);
      process.exit(1);
    });
}

export { main as deployCompleteSetup };