# Elections 2025 DApp - End-to-End Demo Runbook

## Overview
This runbook provides a complete step-by-step demo of the Elections 2025 DApp, from deployment to voting and results viewing.

**Demo Flow:**
1. Start local Hardhat network
2. Deploy complete contract system
3. Generate voter Merkle tree
4. Add candidates to election
5. Execute direct voting
6. Execute quiz-based anonymous voting
7. View results and rankings
8. Check BAL token balances

**Prerequisites:**
- Node.js LTS installed
- Project dependencies installed (`npm install`)
- MetaMask browser extension (optional for manual testing)

---

## Step 1: Start Local Hardhat Network

### Command:
```powershell
npm run node
```

### Expected Output:
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/

Accounts
========
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10000 ETH)
...
```

**Notes:**
- Keep this terminal open throughout the demo
- Network runs on `http://127.0.0.1:8545`
- Default account: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`

---

## Step 2: Generate Voter Merkle Tree

### Command (in new terminal):
```powershell
npm run merkle:build
```

### Expected Output:
```
🚀 Starting Merkle tree generation...
📁 Input file: tools\voters.csv
📁 Output file: tools\out\merkle.json
📄 Header detected, skipping first line
✅ Processed 8 lines
✅ Valid addresses: 8

🌳 Building Merkle tree...
🌳 Merkle root: 0x185622dc03039bc70cbb9ac9a4a086aec201f986b154ec4c55dad48c0a474e23
🍃 Total leaves: 8

💾 Merkle tree saved to: tools\out\merkle.json
✅ Merkle tree generation completed successfully!
```

**Key Data:**
- **Merkle Root**: `0x185622dc03039bc70cbb9ac9a4a086aec201f986b154ec4c55dad48c0a474e23`
- **Eligible Voters**: 8 addresses
- **Proofs File**: `tools/out/merkle.json`

---

## Step 3: Deploy Complete System

### Command:
```powershell
npx hardhat run scripts/deployComplete.ts --network hardhat
```

### Expected Output:
```
🚀 Starting complete deployment process...
Network: hardhat
Chain ID: 31337
Deployer: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

📄 Step 1: Deploying BalToken...
✅ BalToken deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3

📄 Step 2: Deploying Election...
✅ Election deployed to: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

📄 Step 3: Setting Election as BAL token minter...
✅ Election contract added as BAL token minter

📄 Step 4: Setting initial vote reward...
✅ Vote reward set to: 1.0 BAL

📄 Step 5: Checking for Merkle tree...
✅ Found existing Merkle tree with root: 0x185622dc03039bc70cbb9ac9a4a086aec201f986b154ec4c55dad48c0a474e23

📄 Step 6: Creating election...
✅ Election created:
   Name: Test Election 2025
   Start: 18/09/2025, 15:03:18
   End: 19/09/2025, 15:03:18

🎉 DEPLOYMENT COMPLETE!
```

**Key Addresses:**
- **BAL Token**: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- **Election Contract**: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
- **Deployment File**: `deployments/hardhat.json`

---

## Step 4: Add Candidates to Election

### Interactive Hardhat Console:
```powershell
npx hardhat console --network hardhat
```

### Commands in Console:
```javascript
// Get contract instances
const Election = await ethers.getContractFactory("Election");
const election = Election.attach("0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512");

// Add three candidates with questionnaire profiles [topic1, topic2, topic3] (0-10 scale)
await election.addCandidate("Alice Smith", "Progressive leader focused on innovation", [8, 3, 7]);
await election.addCandidate("Bob Johnson", "Conservative candidate with traditional values", [2, 9, 4]);
await election.addCandidate("Carol Williams", "Moderate centrist with balanced approach", [5, 5, 6]);

// Verify candidates were added
const candidates = await election.getActiveCandidates();
console.log("Active candidates:", candidates.length);

// Exit console
process.exit(0);
```

### Expected Output:
```javascript
Active candidates: 3
```

---

## Step 5: Execute Direct Voting

### Get Voter Proof:
First, let's check the Merkle proof for our voter:

```javascript
// In Hardhat console
const fs = require('fs');
const merkleData = JSON.parse(fs.readFileSync('tools/out/merkle.json', 'utf8'));
const voterAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const proof = merkleData.proofs[voterAddress];
console.log("Voter proof:", proof);
```

### Vote for Candidate #1:
```javascript
// Direct vote for Alice Smith (candidate ID 1)
const tx = await election.voteDirect(1, proof);
await tx.wait();
console.log("Vote cast successfully!");

// Check if vote was recorded
const hasVoted = await election.hasVoted(voterAddress);
console.log("Has voted:", hasVoted);

// Check candidate vote count
const candidate1 = await election.candidates(1);
console.log("Alice's votes:", candidate1.voteCount.toString());
```

### Expected Output:
```javascript
Vote cast successfully!
Has voted: true
Alice's votes: 1
```

---

## Step 6: Execute Quiz-Based Anonymous Voting

### Switch to Different Account:
```javascript
// Get second account
const [, voter2] = await ethers.getSigners();
console.log("Voter 2 address:", voter2.address);

// Get proof for second voter
const proof2 = merkleData.proofs[voter2.address];
if (!proof2) {
  console.log("Voter not in whitelist, using first available voter");
  // Use any whitelisted address from the merkle tree
  const whitelistedVoters = Object.keys(merkleData.proofs);
  console.log("Available voters:", whitelistedVoters);
}
```

### Anonymous Quiz Voting:
```javascript
// Connect as second signer and vote anonymously
const election2 = election.connect(voter2);

// Answer questionnaire: [topic1, topic2, topic3] answers (0-10 scale)
// These answers will be matched against candidate profiles using L1 distance
const answers = [7, 4, 6]; // Moderate-progressive answers

// Cast anonymous vote
const proof2Valid = merkleData.proofs["0x70997970C51812dc3A010C7d01b50e0d17dc79C8"];
const tx2 = await election2.voteByQuiz(answers, proof2Valid);
await tx2.wait();
console.log("Anonymous vote cast successfully!");

// The voter doesn't know which candidate they voted for
// But we can check which candidate got the vote by looking at vote counts
const candidate1After = await election.candidates(1);
const candidate2After = await election.candidates(2);
const candidate3After = await election.candidates(3);
console.log("Vote counts after quiz vote:");
console.log("Alice:", candidate1After.voteCount.toString());
console.log("Bob:", candidate2After.voteCount.toString());
console.log("Carol:", candidate3After.voteCount.toString());
```

### Expected Output:
```javascript
Anonymous vote cast successfully!
Vote counts after quiz vote:
Alice: 2
Bob: 0
Carol: 0
```

**Note**: The quiz voting automatically selected Alice (candidate 1) because her profile `[8,3,7]` was closest to the voter's answers `[7,4,6]` using L1 distance calculation.

---

## Step 7: View Results and Rankings

### Get Current Results:
```javascript
// Get ranked results (sorted by votes)
const rankedResults = await election.getRankedResults();
console.log("Ranked Results:");
for (let i = 0; i < rankedResults[0].length; i++) {
  const candidateId = rankedResults[0][i];
  const votes = rankedResults[1][i];
  const candidate = await election.candidates(candidateId);
  console.log(`${i + 1}. ${candidate.name}: ${votes} votes`);
}

// Get winning candidate
const winnerId = await election.getWinningCandidate();
const winner = await election.candidates(winnerId);
console.log(`\n🏆 Winner: ${winner.name} with ${winner.voteCount} votes`);

// Get election info
const electionInfo = await election.elections(0);
console.log("\n📊 Election Status:");
console.log("Name:", electionInfo.name);
console.log("Total Votes:", electionInfo.totalVotes.toString());
console.log("Status:", await election.getElectionStatus());
```

### Expected Output:
```javascript
Ranked Results:
1. Alice Smith: 2 votes
2. Bob Johnson: 0 votes
3. Carol Williams: 0 votes

🏆 Winner: Alice Smith with 2 votes

📊 Election Status:
Name: Test Election 2025
Total Votes: 2
Status: 1
```

---

## Step 8: Check BAL Token Balances

### Verify Reward Distribution:
```javascript
// Get BAL token contract
const BalToken = await ethers.getContractFactory("BalToken");
const balToken = BalToken.attach("0x5FbDB2315678afecb367f032d93F642f64180aa3");

// Check balances for voters
const [voter1, voter2] = await ethers.getSigners();

const balance1 = await balToken.balanceOf(voter1.address);
const balance2 = await balToken.balanceOf(voter2.address);

console.log("🪙 BAL Token Balances:");
console.log(`Voter 1 (${voter1.address}): ${ethers.formatEther(balance1)} BAL`);
console.log(`Voter 2 (${voter2.address}): ${ethers.formatEther(balance2)} BAL`);

// Check total supply
const totalSupply = await balToken.totalSupply();
console.log(`\n📈 Total BAL Supply: ${ethers.formatEther(totalSupply)} BAL`);

// Verify vote reward amount
const voteReward = await balToken.voteReward();
console.log(`💰 Vote Reward: ${ethers.formatEther(voteReward)} BAL per vote`);
```

### Expected Output:
```javascript
🪙 BAL Token Balances:
Voter 1 (0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266): 1.0 BAL
Voter 2 (0x70997970C51812dc3A010C7d01b50e0d17dc79C8): 1.0 BAL

📈 Total BAL Supply: 2.0 BAL
💰 Vote Reward: 1.0 BAL per vote
```

---

## Step 9: Complete Demo Summary

### Final Verification Commands:
```javascript
// Complete election summary
console.log("\n🗳️ ELECTION COMPLETE SUMMARY");
console.log("================================");

const totalVotes = await election.getTotalVotes();
const candidateCount = await election.candidateCount();

console.log(`📊 Total Votes Cast: ${totalVotes}`);
console.log(`👥 Total Candidates: ${candidateCount}`);
console.log(`🪙 BAL Tokens Distributed: ${totalVotes} BAL`);

// Show final candidate standings
console.log("\n🏆 FINAL RESULTS:");
const finalResults = await election.getRankedResults();
for (let i = 0; i < finalResults[0].length; i++) {
  const candidateId = finalResults[0][i];
  const votes = finalResults[1][i];
  const candidate = await election.candidates(candidateId);
  console.log(`${i + 1}. ${candidate.name}: ${votes} votes`);
}

console.log("\n✅ Demo completed successfully!");
```

### Expected Final Output:
```javascript
🗳️ ELECTION COMPLETE SUMMARY
================================
📊 Total Votes Cast: 2
👥 Total Candidates: 3
🪙 BAL Tokens Distributed: 2 BAL

🏆 FINAL RESULTS:
1. Alice Smith: 2 votes
2. Bob Johnson: 0 votes
3. Carol Williams: 0 votes

✅ Demo completed successfully!
```

---

## Alternative: Using Scripts Instead of Console

For a more automated demo, you can create this script file:

### Create `scripts/demo.ts`:
```typescript
import { ethers } from "hardhat";
import fs from "fs";

async function main() {
  console.log("🗳️ Elections 2025 DApp Demo");
  console.log("============================\n");

  // Load deployment data
  const deploymentData = JSON.parse(fs.readFileSync("deployments/hardhat.json", "utf8"));
  const merkleData = JSON.parse(fs.readFileSync("tools/out/merkle.json", "utf8"));

  // Get contract instances
  const Election = await ethers.getContractFactory("Election");
  const election = Election.attach(deploymentData.contracts.election.address);
  
  const BalToken = await ethers.getContractFactory("BalToken");
  const balToken = BalToken.attach(deploymentData.contracts.balToken.address);

  // Get signers
  const [voter1, voter2] = await ethers.getSigners();

  console.log("📍 Contract Addresses:");
  console.log(`Election: ${election.target}`);
  console.log(`BalToken: ${balToken.target}\n`);

  // Add candidates
  console.log("👥 Adding candidates...");
  await election.addCandidate("Alice Smith", "Progressive leader", [8, 3, 7]);
  await election.addCandidate("Bob Johnson", "Conservative candidate", [2, 9, 4]);
  await election.addCandidate("Carol Williams", "Moderate centrist", [5, 5, 6]);
  console.log("✅ Candidates added\n");

  // Direct vote
  console.log("🗳️ Casting direct vote...");
  const proof1 = merkleData.proofs[voter1.address];
  await election.voteDirect(1, proof1);
  console.log("✅ Direct vote cast for Alice Smith\n");

  // Anonymous quiz vote
  console.log("🤐 Casting anonymous quiz vote...");
  const proof2 = merkleData.proofs[voter2.address];
  const election2 = election.connect(voter2);
  await election2.voteByQuiz([7, 4, 6], proof2);
  console.log("✅ Anonymous quiz vote cast\n");

  // Show results
  console.log("📊 Final Results:");
  const results = await election.getRankedResults();
  for (let i = 0; i < results[0].length; i++) {
    const candidate = await election.candidates(results[0][i]);
    console.log(`${i + 1}. ${candidate.name}: ${results[1][i]} votes`);
  }

  // Show BAL balances
  console.log("\n🪙 BAL Token Balances:");
  const balance1 = await balToken.balanceOf(voter1.address);
  const balance2 = await balToken.balanceOf(voter2.address);
  console.log(`Voter 1: ${ethers.formatEther(balance1)} BAL`);
  console.log(`Voter 2: ${ethers.formatEther(balance2)} BAL`);

  console.log("\n✅ Demo completed successfully!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

### Run Demo Script:
```powershell
npx hardhat run scripts/demo.ts --network hardhat
```

---

## Troubleshooting

### Common Issues:

1. **"Cannot connect to network"**
   - Ensure `npm run node` is running in separate terminal
   - Check that port 8545 is not blocked

2. **"Invalid Merkle proof"**
   - Regenerate Merkle tree: `npm run merkle:build`
   - Use addresses that exist in `tools/voters.csv`

3. **"Candidate not found"**
   - Add candidates before voting
   - Use candidate IDs starting from 1

4. **"Election not open"**
   - Check election timing in deployment
   - Elections created with future start times for testing

5. **"Already voted"**
   - Each address can only vote once
   - Use different addresses for multiple votes

### Reset Demo:
To restart the demo:
1. Stop hardhat node (Ctrl+C)
2. Start fresh: `npm run node`
3. Redeploy: `npx hardhat run scripts/deployComplete.ts --network hardhat`

---

## Demo Completion Checklist

- [ ] Local network started successfully
- [ ] Merkle tree generated (8 voters)
- [ ] Contracts deployed and configured
- [ ] 3 candidates added to election
- [ ] Direct vote cast successfully
- [ ] Anonymous quiz vote cast successfully
- [ ] Results show correct vote counts
- [ ] BAL tokens distributed (1 per vote)
- [ ] Winner determined correctly

**Demo Status: ✅ COMPLETE**

Total time: ~10 minutes for full walkthrough