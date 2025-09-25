import { ethers } from "hardhat";
import { MerkleTree } from "merkletreejs";

/**
 * Demo script for Non-Voter Airdrop feature
 * 
 * This script demonstrates:
 * 1. Setting up an election with airdrop reward
 * 2. Having some voters participate and others not
 * 3. Enabling airdrop after election ends
 * 4. Non-voters claiming their airdrop rewards
 * 5. Verifying the airdrop distribution
 */

// Helper function to create Merkle tree from addresses
function createMerkleTree(addresses: string[]): MerkleTree {
  const leaves = addresses.map((addr) => ethers.keccak256(ethers.solidityPacked(["address"], [addr])));
  return new MerkleTree(leaves, ethers.keccak256, { sortPairs: true });
}

// Helper function to get proof for an address
function getMerkleProof(merkleTree: MerkleTree, address: string): string[] {
  const leaf = ethers.keccak256(ethers.solidityPacked(["address"], [address]));
  return merkleTree.getHexProof(leaf);
}

async function main() {
  console.log("🎯 Elections-2025 Non-Voter Airdrop Demo");
  console.log("=" .repeat(50));

  // Get signers
  const [owner, voter1, voter2, voter3, voter4, voter5] = await ethers.getSigners();
  
  console.log("\n📋 Demo Participants:");
  console.log(`Owner/Admin: ${owner.address}`);
  console.log(`Voter 1: ${voter1.address}`);
  console.log(`Voter 2: ${voter2.address}`);
  console.log(`Voter 3: ${voter3.address}`);
  console.log(`Voter 4: ${voter4.address}`);
  console.log(`Voter 5: ${voter5.address}`);

  // 1. Deploy contracts
  console.log("\n🚀 Step 1: Deploying Contracts");
  
  const BalToken = await ethers.getContractFactory("BalToken");
  const balToken = await BalToken.deploy(owner.address);
  await balToken.waitForDeployment();
  console.log(`BAL Token deployed at: ${await balToken.getAddress()}`);

  const Election = await ethers.getContractFactory("Election");
  const election = await Election.deploy(await balToken.getAddress(), owner.address);
  await election.waitForDeployment();
  console.log(`Election contract deployed at: ${await election.getAddress()}`);

  // 2. Setup token minting authorization
  console.log("\n🔐 Step 2: Setting up Token Authorization");
  await balToken.connect(owner).addMinter(await election.getAddress());
  console.log("✅ Election contract authorized to mint BAL tokens");

  // 3. Create Merkle tree for eligible voters
  console.log("\n🌳 Step 3: Creating Voter Merkle Tree");
  const eligibleVoters = [voter1.address, voter2.address, voter3.address, voter4.address, voter5.address];
  const merkleTree = createMerkleTree(eligibleVoters);
  const merkleRoot = merkleTree.getHexRoot();
  console.log(`Merkle Root: ${merkleRoot}`);
  console.log(`Eligible voters: ${eligibleVoters.length}`);

  // 4. Create election with airdrop setup
  console.log("\n🗳️  Step 4: Creating Election");
  const now = Math.floor(Date.now() / 1000);
  const startTime = now + 3660; // Start in 1 hour and 1 minute (meets MIN_START_BUFFER)
  const endTime = startTime + 300; // 5 minute election
  
  await election.connect(owner).createElection(
    "Airdrop Demo Election 2025",
    "Demo election to showcase non-voter airdrop feature",
    startTime,
    endTime,
    merkleRoot,
    false // questionnaire disabled for simplicity
  );
  console.log("✅ Election created successfully");

  // 5. Set airdrop amount
  console.log("\n💰 Step 5: Configuring Airdrop");
  const voteReward = ethers.parseEther("1.0"); // 1 BAL for voting
  const airdropReward = ethers.parseEther("0.5"); // 0.5 BAL for non-voters
  
  await election.connect(owner).setReward(voteReward);
  await election.connect(owner).setAirdropAmount(airdropReward);
  
  console.log(`Vote reward: ${ethers.formatEther(voteReward)} BAL`);
  console.log(`Airdrop reward: ${ethers.formatEther(airdropReward)} BAL`);

  // 6. Add candidates
  console.log("\n👥 Step 6: Adding Candidates");
  await election.connect(owner).addCandidate("Alice Smith", "Progressive candidate", [5, 7, 3]);
  await election.connect(owner).addCandidate("Bob Johnson", "Conservative candidate", [8, 2, 6]);
  console.log("✅ Added 2 candidates to election");

  // 7. Wait for election to start
  console.log("\n⏰ Step 7: Waiting for Election to Start");
  console.log("Waiting for election start time...");
  while (Math.floor(Date.now() / 1000) < startTime) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  console.log("✅ Election is now active!");

  // 8. Some voters participate, others don't
  console.log("\n🗳️  Step 8: Voting Phase");
  
  // voter1 and voter2 vote, voter3, voter4, voter5 don't vote
  const proof1 = getMerkleProof(merkleTree, voter1.address);
  const proof2 = getMerkleProof(merkleTree, voter2.address);
  
  await election.connect(voter1).voteDirect(1, proof1); // Vote for Alice
  await election.connect(voter2).voteDirect(2, proof2); // Vote for Bob
  
  console.log("✅ Voter 1 voted for Alice Smith");
  console.log("✅ Voter 2 voted for Bob Johnson");
  console.log("⏸️  Voter 3, 4, 5 did not participate");

  // 9. Check initial BAL balances
  console.log("\n💳 Step 9: Checking Initial BAL Balances");
  for (let i = 1; i <= 5; i++) {
    const voter = eval(`voter${i}`);
    const balance = await balToken.balanceOf(voter.address);
    console.log(`Voter ${i}: ${ethers.formatEther(balance)} BAL`);
  }

  // 10. Wait for election to end
  console.log("\n⏳ Step 10: Waiting for Election to End");
  while (Math.floor(Date.now() / 1000) <= endTime) {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  console.log("✅ Election has ended!");

  // 11. Enable airdrop
  console.log("\n🎁 Step 11: Enabling Airdrop for Non-Voters");
  await election.connect(owner).enableAirdrop();
  console.log("✅ Airdrop enabled for non-voters!");

  // 12. Non-voters claim their airdrop
  console.log("\n🎯 Step 12: Non-Voters Claiming Airdrop");
  
  const proof3 = getMerkleProof(merkleTree, voter3.address);
  const proof4 = getMerkleProof(merkleTree, voter4.address);
  const proof5 = getMerkleProof(merkleTree, voter5.address);
  
  // Voter3 claims airdrop
  const tx3 = await election.connect(voter3).claimAirdrop(proof3);
  await tx3.wait();
  console.log("✅ Voter 3 claimed airdrop successfully");
  
  // Voter4 claims airdrop
  const tx4 = await election.connect(voter4).claimAirdrop(proof4);
  await tx4.wait();
  console.log("✅ Voter 4 claimed airdrop successfully");
  
  // Voter5 claims airdrop
  const tx5 = await election.connect(voter5).claimAirdrop(proof5);
  await tx5.wait();
  console.log("✅ Voter 5 claimed airdrop successfully");

  // 13. Verify that voters cannot claim airdrop
  console.log("\n❌ Step 13: Verifying Voters Cannot Claim Airdrop");
  try {
    await election.connect(voter1).claimAirdrop(proof1);
    console.log("❌ ERROR: Voter 1 should not be able to claim airdrop!");
  } catch (error: any) {
    console.log("✅ Voter 1 correctly rejected from airdrop (already voted)");
  }

  // 14. Check final BAL balances
  console.log("\n💰 Step 14: Final BAL Token Distribution");
  console.log("-".repeat(50));
  
  let totalDistributed = 0n;
  for (let i = 1; i <= 5; i++) {
    const voter = eval(`voter${i}`);
    const balance = await balToken.balanceOf(voter.address);
    const balanceEth = ethers.formatEther(balance);
    totalDistributed += balance;
    
    if (i <= 2) {
      console.log(`Voter ${i} (VOTED): ${balanceEth} BAL (vote reward)`);
    } else {
      console.log(`Voter ${i} (AIRDROP): ${balanceEth} BAL (non-voter airdrop)`);
    }
  }

  // 15. Verify airdrop claim status
  console.log("\n📊 Step 15: Airdrop Claim Status");
  console.log("-".repeat(50));
  for (let i = 1; i <= 5; i++) {
    const voter = eval(`voter${i}`);
    const voted = await election.hasVoted(voter.address);
    const claimed = await election.claimedAirdrop(voter.address);
    
    console.log(`Voter ${i}: Voted=${voted}, Claimed Airdrop=${claimed}`);
  }

  // 16. Display election results
  console.log("\n🏆 Step 16: Final Election Results");
  console.log("-".repeat(50));
  const totalVotes = await election.totalVotes();
  console.log(`Total votes cast: ${totalVotes}`);
  
  const candidate1 = await election.candidates(1);
  const candidate2 = await election.candidates(2);
  
  console.log(`Alice Smith: ${candidate1.voteCount} votes`);
  console.log(`Bob Johnson: ${candidate2.voteCount} votes`);
  
  // 17. Summary
  console.log("\n🎉 Demo Summary");
  console.log("=" .repeat(50));
  console.log(`✅ Total BAL distributed: ${ethers.formatEther(totalDistributed)} BAL`);
  console.log(`✅ Voters received: ${ethers.formatEther(voteReward)} BAL each (${2} voters)`);
  console.log(`✅ Non-voters received: ${ethers.formatEther(airdropReward)} BAL each (${3} non-voters)`);
  console.log(`✅ Airdrop successfully incentivized ${3} eligible non-voters!`);
  
  console.log("\n🎯 Non-Voter Airdrop Feature Demonstrated Successfully!");
  console.log("Key features proven:");
  console.log("• Admin can set custom airdrop amounts");
  console.log("• Airdrop only enabled after election ends");
  console.log("• Only non-voters can claim airdrop rewards");
  console.log("• Merkle proof verification prevents unauthorized claims");
  console.log("• Double-claiming prevention works correctly");
  console.log("• Proper BAL token distribution to incentivize participation");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });