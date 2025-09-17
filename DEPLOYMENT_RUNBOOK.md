# Deployment Runbook - Elections 2025 DApp

## Prerequisites

1. **Environment Setup**
   ```powershell
   # Install dependencies
   npm install

   # Copy environment template
   cp .env.example .env
   ```

2. **Configure .env file**
   ```bash
   # Required for both local and testnet
   PRIVATE_KEY=your_private_key_here

   # Required for Sepolia deployment (optional)
   SEPOLIA_RPC_URL=https://ethereum-sepolia.blockpi.network/v1/rpc/public
   ETHERSCAN_API_KEY=your_etherscan_api_key_here

   # Optional customization
   VOTE_REWARD=1000000000000000000  # 1 BAL token
   ELECTION_START_DELAY=3900        # Start 65 minutes after deployment
   ELECTION_DURATION=86400          # Run for 24 hours
   ELECTION_NAME="Your Election Name"
   ELECTION_DESCRIPTION="Your election description"
   ```

## Local Network Deployment

### Step 1: Start Local Node

```powershell
# Terminal 1: Start Hardhat local network
npm run node
```

The node will output 20 test accounts with private keys. Use the first account's private key in your `.env` file for testing.

### Step 2: Generate Voter Merkle Tree (Optional but Recommended)

```powershell
# Terminal 2: Generate voter proofs from tools/voters.csv
npm run merkle:build

# Or use custom voter list
npm run merkle:build:custom path/to/custom-voters.csv
```

This creates `tools/out/merkle.json` with voter proofs that the deployment script will automatically use.

### Step 3: Deploy Complete System

```powershell
# Deploy all contracts with full configuration
npm run deploy:complete:local
```

**What this does:**
1. Deploys BalToken contract
2. Deploys Election contract
3. Sets Election as authorized BAL minter
4. Sets vote reward (1 BAL by default)
5. Checks for existing Merkle tree and uses it
6. Creates election with proper timing
7. Saves deployment addresses to `deployments/localhost.json`

### Step 4: Verify Deployment

Check the deployment file:
```powershell
cat deployments/localhost.json
```

Expected output structure:
```json
{
  "network": "localhost",
  "contracts": {
    "balToken": { "address": "0x...", "txHash": "0x..." },
    "election": { "address": "0x...", "txHash": "0x..." }
  },
  "configuration": {
    "voteReward": "1000000000000000000",
    "electionStartTime": 1758096252,
    "electionEndTime": 1758182652,
    "merkleRoot": "0x..."
  }
}
```

## Sepolia Testnet Deployment

### Step 1: Fund Your Account

Ensure your wallet has Sepolia ETH. Get testnet ETH from:
- [Sepolia Faucet](https://sepoliafaucet.com/)
- [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)

### Step 2: Deploy to Sepolia

```powershell
# Deploy to Sepolia testnet
npm run deploy:complete:sepolia
```

### Step 3: Verify Contracts (Optional)

If you have an Etherscan API key configured:
```powershell
# Verify BalToken
npx hardhat verify --network sepolia <BAL_TOKEN_ADDRESS> <DEPLOYER_ADDRESS>

# Verify Election
npx hardhat verify --network sepolia <ELECTION_ADDRESS> <BAL_TOKEN_ADDRESS> <DEPLOYER_ADDRESS>
```

## Basic Interaction Commands

After deployment, you can interact with the contracts:

### Using Hardhat Console

```powershell
# Connect to local network
npx hardhat console --network localhost

# Or connect to Sepolia
npx hardhat console --network sepolia
```

### Contract Interaction Examples

```javascript
// Get contract instances (replace addresses with your deployment)
const balToken = await ethers.getContractAt("BalToken", "0x...");
const election = await ethers.getContractAt("Election", "0x...");

// Check election info
await election.getElectionInfo();

// Add a candidate (only owner)
await election.addCandidate("Alice Smith", "Experienced leader", [5, 7, 3]);
await election.addCandidate("Bob Johnson", "Fresh perspective", [8, 4, 6]);

// Check candidate count
await election.candidateCount();

// Get candidate info
await election.candidates(1);

// Check voter eligibility (requires Merkle proof)
// Load proofs from tools/out/merkle.json
const merkleData = require('./tools/out/merkle.json');
const voterAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const proof = merkleData.proofs[voterAddress];

// Vote directly (when election is active)
await election.voteDirect(1, proof);

// Check BAL balance after voting
await balToken.balanceOf(voterAddress); // Should be 1 BAL
```

## Troubleshooting

### Common Issues

1. **"InvalidTimeFrame" Error**
   - Election start time must be at least 1 hour in the future
   - Increase `ELECTION_START_DELAY` in .env file

2. **"Invalid root" Error**
   - Merkle root cannot be all zeros
   - Run `npm run merkle:build` to generate valid voter tree

3. **"Insufficient funds" Error**
   - Ensure deployer account has enough ETH for gas fees
   - For local: Use provided test accounts
   - For Sepolia: Get testnet ETH from faucets

4. **Missing Merkle Tree**
   - If no `tools/out/merkle.json` exists, deployment uses placeholder root
   - Generate real voter proofs with `npm run merkle:build`

### Deployment Files

- **Success**: `deployments/<network>.json`
- **Failure**: `deployments/<network>-failed.json` (partial deployment data)

### Reset Local Environment

```powershell
# Stop local node (Ctrl+C)
# Restart node (clears all state)
npm run node

# Clean build artifacts
npm run clean

# Rebuild contracts
npm run compile
```

## Next Steps After Deployment

1. **Add Candidates**
   ```javascript
   await election.addCandidate("Name", "Description", [topic1, topic2, topic3]);
   ```

2. **Wait for Election Start**
   - Check current time vs `electionStartTime` in deployment file
   - Election becomes active automatically

3. **Test Voting**
   - Use addresses from `tools/out/merkle.json`
   - Get proofs for each voter
   - Call `voteDirect()` or `voteByQuiz()`

4. **Monitor Results**
   ```javascript
   await election.getRankedResults();
   await election.getWinningCandidate();
   ```

## Security Considerations

⚠️ **WARNING**:
- Never use test private keys on mainnet
- Keep your actual private keys secure
- The provided test accounts are publicly known
- Always verify contract addresses before interacting

✅ **Best Practices**:
- Use environment variables for sensitive data
- Verify all deployment addresses
- Test thoroughly on local network before mainnet
- Keep deployment files for reference