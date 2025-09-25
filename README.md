# Elections-2025 DApp

A comprehensive decentralized election application built on Ethereum featuring Merkle tree voter verification, ERC-20 token rewards, and anonymous questionnaire-based candidate selection.

## Overview

Elections-2025 is a full-stack blockchain application that enables secure, transparent, and decentralized elections with:

- **Merkle Tree Voter Verification**: Efficient on-chain voter eligibility verification
- **Dual Voting Modes**: Direct candidate selection and anonymous quiz-based matching  
- **ERC-20 Rewards**: BAL token rewards for successful votes (1 BAL per vote)
- **Admin Dashboard**: Complete election management interface
- **Real-time Results**: Live vote tracking and winner announcements
- **Security Hardened**: Comprehensive input validation and reentrancy protection

## Tech Stack

### Smart Contracts
- **Solidity** with OpenZeppelin security standards
- **Hardhat** development framework with TypeScript
- **Merkle Tree** for efficient voter verification
- **ERC-20** token rewards with authorized minting

### Frontend  
- **React + TypeScript** with modern hooks
- **Vite** for fast development and building
- **wagmi + viem** for Ethereum integration
- **MetaMask** wallet connection

### Testing & Tools
- **79 Comprehensive Tests** with 91.78% coverage
- **TypeScript** throughout for type safety  
- **CLI Tools** for voter list management
- **Automated Deployment** scripts

## Quick Start

### Prerequisites
- Node.js 18+ LTS
- npm or pnpm
- MetaMask browser extension

### 1. Installation
```powershell
# Clone and install dependencies
git clone <repository-url>
cd elections-2025-dapp
npm install

# Set up environment
copy .env.example .env
```

### 2. Development Setup
```powershell
# Terminal 1: Start local blockchain
npm run node

# Terminal 2: Generate voter eligibility data  
npm run merkle:build

# Terminal 3: Deploy complete system
npm run deploy:complete:local

# Terminal 4: Start frontend
npm run dev:web
```

### 3. Access the DApp
- **Frontend**: http://localhost:3000
- **Network**: Add localhost:8545 to MetaMask (Chain ID: 31337)
- **Test Accounts**: Import private keys from Hardhat console output

## Core Features

### 🗳️ Voting System
- **Direct Voting**: Select candidates directly with Merkle proof verification
- **Quiz-Based Voting**: Anonymous candidate matching using questionnaire profiles
- **Single Vote Enforcement**: Prevents double voting with on-chain verification
- **Timed Elections**: Configurable start/end times with automatic state management

### 🏆 Results & Rewards
- **Real-time Results**: Live vote counting and rankings
- **Winner Determination**: Automatic winner calculation with tie handling
- **BAL Token Rewards**: 1 BAL token minted per successful vote
- **Transparency**: All votes and results verifiable on-chain

### 🔐 Security Features  
- **Merkle Tree Verification**: Gas-efficient voter eligibility checking
- **Reentrancy Protection**: OpenZeppelin guards on all state-changing functions
- **Input Validation**: Comprehensive zero address and bounds checking
- **Access Control**: Owner-only admin functions with proper authorization

### 👨‍💼 Admin Features
- **Election Creation**: Set timing, candidate limits, and reward amounts
- **Candidate Management**: Add/remove candidates with questionnaire profiles
- **Real-time Monitoring**: Track participation and vote distributions
- **Results Publication**: Finalize and announce election results

## Project Structure

```
├── contracts/           # Smart contracts
│   ├── Election.sol     # Main election contract
│   ├── BalToken.sol     # ERC-20 reward token
│   └── interfaces/      # Contract interfaces
├── scripts/            # Deployment scripts
├── test/               # Comprehensive test suite (79 tests)
├── tools/              # CLI utilities
│   ├── buildMerkleTree.ts    # Voter list processor
│   └── generateVoterList.ts  # Sample data generator  
├── web/                # React frontend
│   ├── src/components/ # UI components  
│   ├── src/contracts/  # Contract ABIs and addresses
│   └── public/         # Static assets
├── docs/               # Documentation
└── deployments/        # Deployment records
```

## Smart Contract APIs

### Election Contract
```solidity
// Direct voting with Merkle proof
function voteDirect(uint256 candidateId, bytes32[] calldata proof) external

// Anonymous quiz-based voting  
function voteByQuiz(uint8[3] calldata answers, bytes32[] calldata proof) external

// Admin functions
function addCandidate(string calldata name, string calldata description, uint8[3] calldata questionnaire) external

// Results
function getRanking() external view returns (uint256[] memory, uint256[] memory)
function getWinningCandidate() external view returns (uint256)
```

### BalToken Contract  
```solidity
// Authorized minting for vote rewards
function mintVoteReward(address voter, uint256 amount) external

// Standard ERC-20 functions
function balanceOf(address account) external view returns (uint256)  
function transfer(address to, uint256 amount) external returns (bool)
```

## Available Commands

### Development
```powershell
npm run compile         # Compile contracts
npm test               # Run test suite (79 tests)
npm run coverage       # Generate coverage report
npm run node           # Start local blockchain
```

### Deployment
```powershell
npm run deploy:complete:local    # Deploy to localhost with full setup
npm run deploy:complete:sepolia  # Deploy to Sepolia testnet
```

### Tools
```powershell
npm run merkle:build                      # Generate voter Merkle tree
npm run merkle:build:custom path/to/csv   # Process custom voter list
```

### Frontend
```powershell
npm run dev:web        # Start React development server
npm run build:web      # Build for production
```

## Testing

The project includes comprehensive testing with **79 test cases** covering:

- ✅ **Contract Deployment** - Valid initialization and error handling
- ✅ **Voter Verification** - Merkle proof validation and security
- ✅ **Direct Voting** - Vote casting, validation, and storage
- ✅ **Quiz Voting** - Anonymous matching and L1 distance calculation
- ✅ **Token Rewards** - BAL minting and distribution
- ✅ **Access Control** - Admin function protection
- ✅ **Results System** - Ranking, winner determination, tie handling
- ✅ **Security** - Reentrancy protection, input validation

```powershell
npm test               # Run all tests
npm run coverage       # Generate coverage report (91.78% statement coverage)
```

## Security Considerations

### Implemented Protections ✅
- **Reentrancy Guards**: OpenZeppelin protection on all voting functions
- **Double Voting Prevention**: On-chain hasVoted mapping enforcement  
- **Input Validation**: Zero address checks and bounds validation
- **Access Control**: Owner-only admin functions with proper modifiers
- **Merkle Verification**: Cryptographic voter eligibility proofs

### Production Recommendations  
- Professional security audit before mainnet deployment
- Multi-signature wallet for admin operations (Gnosis Safe recommended)
- Consider Layer 2 deployment for reduced gas costs
- Implement pause mechanism for emergency situations
- Regular monitoring and incident response procedures

### Known Limitations
- Single election per contract deployment
- Admin key management requires secure practices
- Direct voting choices visible in mempool (MEV exposure)
- Merkle tree generation relies on off-chain integrity

See [SECURITY.md](SECURITY.md) for detailed threat analysis and mitigation strategies.

## Documentation

- **[Architecture Guide](docs/architecture.md)** - System design and component interactions
- **[Security Analysis](SECURITY.md)** - Threat model and mitigation strategies  
- **[Testing Guide](TESTING_GUIDE.md)** - Test coverage and validation procedures
- **[Deployment Guide](DEPLOYMENT_RUNBOOK.md)** - Step-by-step deployment instructions
- **[E2E Demo Guide](E2E_DEMO_RUNBOOK.md)** - Complete demonstration walkthrough

## Network Configuration

### Localhost Development
- **RPC URL**: http://localhost:8545
- **Chain ID**: 31337
- **Currency**: ETH

### Sepolia Testnet
- **RPC URL**: https://sepolia.infura.io/v3/YOUR_PROJECT_ID  
- **Chain ID**: 11155111
- **Faucet**: https://sepoliafaucet.com/

## Performance Metrics

### Gas Optimization Results
- **Storage Efficiency**: 20-30% reduction through struct packing
- **Custom Errors**: More gas-efficient than string messages
- **Type Optimization**: uint32 types for election-scale operations
- **Merkle Verification**: O(log n) voter validation complexity

### Test Coverage
```
File                   |  % Stmts | % Branch |  % Funcs |  % Lines
-----------------------|----------|----------|----------|----------
contracts/             |    91.78 |    72.04 |    88.37 |    92.34
 BalToken.sol         |      100 |       75 |      100 |    96.77
 Election.sol         |       90 |    71.33 |    84.85 |    91.57
All files              |    91.78 |    72.04 |    88.37 |    92.34
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Standards
- All code must pass existing tests
- New features require corresponding tests
- Follow TypeScript strict mode
- Use OpenZeppelin standards for security
- Document all public functions with NatSpec

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For questions, issues, or contributions:

- **Issues**: Use GitHub Issues for bug reports and feature requests
- **Documentation**: Check the `/docs` directory for detailed guides
- **Testing**: Run the comprehensive test suite for validation

---

**Elections-2025 DApp** - Secure, transparent, and decentralized elections on Ethereum
*Built with modern web3 technologies and security best practices*