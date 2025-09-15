import { ethers } from "hardhat";
import { MerkleTree } from "merkletreejs";
import { keccak256 } from "ethers";

// This should match the voters used in setupElection.ts
const SAMPLE_VOTERS = [
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Hardhat account #0
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Hardhat account #1
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // Hardhat account #2
  "0x90F79bf6EB2c4f870365E785982E1f101E93b906", // Hardhat account #3
  "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65", // Hardhat account #4
];

function createMerkleTree(voters: string[]): MerkleTree {
  const leaves = voters.map(address => keccak256(address));
  return new MerkleTree(leaves, keccak256, { sortPairs: true });
}

function getProof(tree: MerkleTree, address: string): string[] {
  const leaf = keccak256(address);
  return tree.getHexProof(leaf);
}

async function main() {
  const [deployer, voter1, voter2, voter3] = await ethers.getSigners();

  console.log("Casting votes...");

  const ELECTION_ADDRESS = process.env.ELECTION_ADDRESS || "";

  if (!ELECTION_ADDRESS) {
    console.error("❌ Please set ELECTION_ADDRESS in your .env file");
    process.exit(1);
  }

  const election = await ethers.getContractAt("Election", ELECTION_ADDRESS);
  const merkleTree = createMerkleTree(SAMPLE_VOTERS);

  console.log("📄 Connected to Election:", ELECTION_ADDRESS);

  // Check election status
  const status = await election.getElectionStatus();
  console.log("Election Status:", status);

  if (status !== "Active") {
    console.log("⏰ Election is not active. Current status:", status);
    const electionInfo = await election.getElectionInfo();
    const startTime = new Date(Number(electionInfo.startTime) * 1000);
    const endTime = new Date(Number(electionInfo.endTime) * 1000);
    console.log("Start time:", startTime.toLocaleString());
    console.log("End time:", endTime.toLocaleString());

    if (status === "Scheduled") {
      console.log("💡 Wait for the election to start, or use time helpers in tests");
      return;
    }
  }

  console.log("\n🗳️  Casting votes...");

  // Vote 1: Direct vote for Alice Johnson (Candidate 1)
  console.log("\nVoter 1 voting for Alice Johnson...");
  const proof1 = getProof(merkleTree, voter1.address);

  try {
    const voteTx1 = await election.connect(voter1).vote(
      1, // Candidate ID for Alice
      proof1,
      [7, 6, 5] // Voter's questionnaire profile
    );
    await voteTx1.wait();
    console.log("✅ Voter 1 voted successfully for Alice Johnson");
  } catch (error: any) {
    console.log("❌ Voter 1 vote failed:", error.message);
  }

  // Vote 2: Direct vote for Bob Smith (Candidate 2)
  console.log("\nVoter 2 voting for Bob Smith...");
  const proof2 = getProof(merkleTree, voter2.address);

  try {
    const voteTx2 = await election.connect(voter2).vote(
      2, // Candidate ID for Bob
      proof2,
      [3, 8, 6] // Voter's questionnaire profile
    );
    await voteTx2.wait();
    console.log("✅ Voter 2 voted successfully for Bob Smith");
  } catch (error: any) {
    console.log("❌ Voter 2 vote failed:", error.message);
  }

  // Vote 3: Anonymous vote (questionnaire matching)
  console.log("\nVoter 3 casting anonymous vote...");
  const proof3 = getProof(merkleTree, voter3.address);

  try {
    const voteTx3 = await election.connect(voter3).voteAnonymous(
      proof3,
      [5, 7, 9] // This profile should match closest to Carol Davis [6, 6, 9]
    );
    await voteTx3.wait();
    console.log("✅ Voter 3 voted anonymously (matched to best candidate)");
  } catch (error: any) {
    console.log("❌ Voter 3 vote failed:", error.message);
  }

  console.log("\n📊 Current Results:");

  // Get current vote counts
  const totalVotes = await election.totalVotes();
  console.log("Total votes cast:", totalVotes.toString());

  // Get candidate vote counts
  for (let i = 1; i <= 3; i++) {
    const candidate = await election.getCandidate(i);
    console.log(`${candidate.name}: ${candidate.voteCount} votes`);
  }

  // Check BAL token balances
  const balTokenAddress = await election.balToken();
  const balToken = await ethers.getContractAt("BalToken", balTokenAddress);

  console.log("\n💰 BAL Token Rewards:");
  const voters = [voter1, voter2, voter3];

  for (let i = 0; i < voters.length; i++) {
    const balance = await balToken.balanceOf(voters[i].address);
    console.log(`Voter ${i + 1}: ${ethers.formatEther(balance)} BAL`);
  }

  console.log("\n🎉 Voting demonstration complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Voting failed:", error);
    process.exit(1);
  });