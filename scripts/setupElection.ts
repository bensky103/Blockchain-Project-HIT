import { ethers } from "hardhat";
import { MerkleTree } from "merkletreejs";
import { keccak256 } from "ethers";

// Sample voter addresses for testing
const SAMPLE_VOTERS = [
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Hardhat account #0
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Hardhat account #1
  "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // Hardhat account #2
  "0x90F79bf6EB2c4f870365E785982E1f101E93b906", // Hardhat account #3
  "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65", // Hardhat account #4
];

async function createMerkleTree(voters: string[]): Promise<{ root: string; tree: MerkleTree }> {
  const leaves = voters.map(address => keccak256(address));
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  const root = tree.getHexRoot();

  console.log("📋 Merkle Tree Created:");
  console.log("Root:", root);
  console.log("Voters:", voters.length);

  return { root, tree };
}

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Setting up election with account:", deployer.address);

  // Get deployed contract addresses (you'll need to update these after deployment)
  const ELECTION_ADDRESS = process.env.ELECTION_ADDRESS || "";
  const BAL_TOKEN_ADDRESS = process.env.BAL_TOKEN_ADDRESS || "";

  if (!ELECTION_ADDRESS || !BAL_TOKEN_ADDRESS) {
    console.error("❌ Please set ELECTION_ADDRESS and BAL_TOKEN_ADDRESS in your .env file");
    process.exit(1);
  }

  const election = await ethers.getContractAt("Election", ELECTION_ADDRESS);
  const balToken = await ethers.getContractAt("BalToken", BAL_TOKEN_ADDRESS);

  console.log("📄 Connected to contracts:");
  console.log("Election:", ELECTION_ADDRESS);
  console.log("BalToken:", BAL_TOKEN_ADDRESS);

  // Create Merkle tree for voters
  const { root } = await createMerkleTree(SAMPLE_VOTERS);

  // Set election parameters
  const now = Math.floor(Date.now() / 1000);
  const startTime = now + 300; // Start in 5 minutes
  const endTime = startTime + 3600; // 1 hour duration

  console.log("\n🗳️  Creating Election...");
  const createElectionTx = await election.createElection(
    "Sample Election 2025",
    "A demonstration election for the voting DApp",
    startTime,
    endTime,
    root,
    true // Enable questionnaire
  );
  await createElectionTx.wait();
  console.log("✅ Election created successfully!");

  console.log("\n👥 Adding Candidates...");

  // Add candidate 1
  const addCandidate1Tx = await election.addCandidate(
    "Alice Johnson",
    "Experienced leader focused on economic growth and innovation",
    [7, 5, 8] // questionnaire profile: [economic, social, environmental]
  );
  await addCandidate1Tx.wait();
  console.log("✅ Candidate 1 added: Alice Johnson");

  // Add candidate 2
  const addCandidate2Tx = await election.addCandidate(
    "Bob Smith",
    "Young reformer with focus on social justice and sustainability",
    [4, 9, 7]
  );
  await addCandidate2Tx.wait();
  console.log("✅ Candidate 2 added: Bob Smith");

  // Add candidate 3
  const addCandidate3Tx = await election.addCandidate(
    "Carol Davis",
    "Environmental advocate with balanced approach to policy",
    [6, 6, 9]
  );
  await addCandidate3Tx.wait();
  console.log("✅ Candidate 3 added: Carol Davis");

  console.log("\n📊 Election Setup Complete!");
  console.log("========================");
  console.log("Election Name: Sample Election 2025");
  console.log("Start Time:", new Date(startTime * 1000).toLocaleString());
  console.log("End Time:", new Date(endTime * 1000).toLocaleString());
  console.log("Candidates: 3");
  console.log("Eligible Voters:", SAMPLE_VOTERS.length);

  console.log("\n🎯 Voter Information:");
  console.log("Eligible voter addresses:");
  SAMPLE_VOTERS.forEach((address, index) => {
    console.log(`  ${index + 1}. ${address}`);
  });

  console.log("\n⚡ Ready for voting!");
  console.log("Use the web interface or scripts to cast votes.");

  // Get election info to verify
  const electionInfo = await election.getElectionInfo();
  console.log("\n🔍 Verification:");
  console.log("Election active:", electionInfo.isActive);
  console.log("Questionnaire enabled:", electionInfo.questionnaireEnabled);
  console.log("Candidate count:", await election.candidateCount());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  });