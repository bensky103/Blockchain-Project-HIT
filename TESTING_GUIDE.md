# Elections 2025 DApp - Complete Testing Guide

## Overview
This document provides step-by-step instructions for testing the complete Elections 2025 decentralized application, including smart contracts, Merkle tree generation, deployment, and frontend interaction.

## Prerequisites

### Required Software
- Node.js (LTS version 18.x or 20.x)
- npm or pnpm package manager
- MetaMask browser extension
- Git for version control

### Environment Setup
1. Clone and navigate to project directory
2. Copy `.env.example` to `.env`
3. Add your private key for deployment (test key is provided)
4. Ensure all dependencies are installed

## Phase 1: Smart Contract Testing

### 1.1 Local Blockchain Setup
```powershell
# Terminal 1: Start local Hardhat network
npm run node

# Expected output:
# Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/
# Accounts with 10000 ETH each will be displayed
```

### 1.2 Contract Compilation and Testing
```powershell
# Terminal 2: Compile contracts
npm run compile

# Run comprehensive test suite (79 tests)
npm test

# Generate test coverage report
npm run coverage

# Expected: All tests pass with 90%+ coverage
```

### 1.3 Merkle Tree Generation
```powershell
# Generate voter eligibility tree from CSV
npm run merkle:build

# Custom voter list (optional)
npm run merkle:build:custom tools/custom-voters.csv

# Verify output: tools/out/merkle.json created with root and proofs
```

### 1.4 Complete Contract Deployment
```powershell
# Deploy all contracts with full configuration
npm run deploy:complete:local

# Expected output:
# - BalToken deployed and configured
# - Election contract deployed with minter authorization
# - Election created with proper timing and Merkle root
# - Deployment addresses saved to deployments/localhost.json
```

## Phase 2: Frontend Integration Testing

### 2.1 Frontend Setup
```powershell
# Navigate to web directory
cd web

# Install frontend dependencies
npm install

# Start development server
npm run dev

# Expected: Development server starts at http://localhost:3000
```

### 2.2 MetaMask Configuration
1. **Add Local Network to MetaMask:**
   - Network Name: `Localhost`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency Symbol: `ETH`

2. **Import Test Accounts:**
   - Use private keys from Hardhat node output
   - Import at least 3-4 accounts for comprehensive testing
   - Each account starts with 10000 ETH

### 2.3 Admin Dashboard Testing
1. **Connect Wallet:**
   - Open http://localhost:3000
   - Click "Connect MetaMask"
   - Approve connection and network switch

2. **Election Management:**
   - Navigate to "Admin" tab
   - Verify election status and timing information
   - Note: Modification requires owner account (first Hardhat account)

3. **Candidate Management:**
   - Click "Add Candidate"
   - Fill in candidate information:
     - Name: "Alice Johnson"
     - Description: "Environmental policy advocate"
     - Questionnaire: [7, 5, 9] (0-10 scale)
   - Submit and wait for transaction confirmation
   - Repeat for 2-3 more candidates

### 2.4 Voter Interface Testing
1. **Switch to Voter Account:**
   - Change MetaMask account to a different address
   - Ensure address is in the Merkle tree (check tools/voters.csv)

2. **Direct Voting:**
   - Navigate to "Vote" tab
   - Select "Direct Vote" mode
   - Choose a candidate
   - Click "Cast Vote" and confirm transaction
   - Verify success message and BAL token reward

3. **Quiz-Based Voting (Different Account):**
   - Switch to another eligible voter account
   - Select "Anonymous Quiz" mode
   - Adjust policy preference sliders
   - Click "Cast Anonymous Vote"
   - Note: Candidate selection is anonymous

### 2.5 Results Dashboard Testing
1. **Real-Time Results:**
   - Navigate to "Results" tab
   - Verify vote counts update in real-time
   - Check winner/leader display
   - View detailed rankings table

2. **Statistics Verification:**
   - Check total votes matches actual votes cast
   - Verify BAL tokens distributed equals vote count
   - Review participation statistics

## Phase 3: Advanced Feature Testing

### 3.1 Merkle Proof Verification
1. **Eligible Voter Testing:**
   - Use addresses from tools/voters.csv
   - Verify voting interface allows participation
   - Check that Merkle proof is automatically loaded

2. **Ineligible Voter Testing:**
   - Switch to account not in voter list
   - Confirm voting interface shows "not authorized" message
   - Verify no voting functions are accessible

### 3.2 Election Lifecycle Testing
1. **Pre-Voting Phase:**
   - Verify only admin can modify candidates
   - Check that voting functions are disabled
   - Confirm election status shows "Scheduled"

2. **Active Voting Phase:**
   - Wait for election start time (or modify contract for testing)
   - Verify status changes to "Active"
   - Test both voting methods work
   - Confirm admin modifications are disabled

3. **Post-Voting Phase:**
   - Wait for election end time
   - Verify status changes to "Ended"
   - Confirm voting is disabled
   - Check final results are available

### 3.3 Token Integration Testing
1. **BAL Token Verification:**
   - Check initial total supply is 0
   - Verify 1 BAL minted per vote
   - Test token balance display in UI
   - Confirm token transfers work (optional)

2. **Reward System Testing:**
   - Vote from multiple accounts
   - Verify each voter receives exactly 1 BAL
   - Check that double voting is prevented
   - Confirm token balances are accurate

## Phase 4: Error Handling and Edge Cases

### 4.1 Contract Error Testing
1. **Double Voting Prevention:**
   - Attempt to vote twice with same account
   - Verify "AlreadyVoted" error is handled gracefully

2. **Invalid Merkle Proof:**
   - Test with account not in voter list
   - Confirm "InvalidMerkleProof" error handling

3. **Election Timing:**
   - Attempt voting before start or after end
   - Verify appropriate error messages

### 4.2 Frontend Error Handling
1. **Network Issues:**
   - Disconnect from internet briefly
   - Verify error messages display properly
   - Test reconnection handling

2. **Transaction Failures:**
   - Reject MetaMask transactions
   - Verify UI handles rejection gracefully
   - Check retry functionality

## Phase 5: Performance and Security Testing

### 5.1 Performance Testing
1. **Large Candidate Lists:**
   - Add 10+ candidates through admin interface
   - Test voting interface performance
   - Verify results rendering speed

2. **Multiple Simultaneous Votes:**
   - Cast votes from multiple accounts quickly
   - Check for race conditions
   - Verify result consistency

### 5.2 Security Verification
1. **Access Control:**
   - Confirm only admin can manage candidates
   - Verify voter restrictions work properly
   - Test ownership functions

2. **Smart Contract Security:**
   - Review reentrancy protection
   - Verify input validation
   - Check for overflow conditions

## Troubleshooting Common Issues

### MetaMask Connection Problems
- Ensure localhost network is added correctly
- Check that chain ID matches (31337)
- Reset account if transactions stuck

### Contract Interaction Failures
- Verify contracts are deployed (check deployments/localhost.json)
- Ensure Hardhat node is running
- Check account has sufficient ETH for gas

### Merkle Proof Issues
- Verify tools/out/merkle.json exists
- Check that wallet address is in voter list
- Confirm merkle.json is copied to web/public/

### Frontend Loading Issues
- Clear browser cache
- Check developer console for errors
- Verify all dependencies installed

## Success Criteria

✅ **Smart Contracts:**
- All 79 tests pass
- Contracts deploy successfully
- Full functionality verified

✅ **Merkle Tree System:**
- CSV processing works correctly
- Proofs generated and verified
- Voter eligibility enforced

✅ **Frontend Interface:**
- Wallet connection functional
- All three dashboards operational
- Real-time updates working

✅ **End-to-End Flow:**
- Admin can manage elections
- Voters can cast ballots
- Results display correctly
- Token rewards distributed

✅ **Security & Error Handling:**
- Access controls enforced
- Error states handled gracefully
- Double voting prevented

## Next Steps for Production

1. **Sepolia Testnet Deployment:**
   - Configure Sepolia RPC endpoint
   - Deploy with `npm run deploy:complete:sepolia`
   - Test with real test ETH

2. **Frontend Deployment:**
   - Build for production: `npm run build`
   - Deploy to Vercel, Netlify, or similar
   - Configure environment variables

3. **Security Audit:**
   - Professional smart contract audit
   - Frontend security review
   - Penetration testing

4. **User Documentation:**
   - Voter guide creation
   - Admin manual development
   - Troubleshooting guides