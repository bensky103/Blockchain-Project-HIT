# Frontend Development Conventions

## Project Overview
Building a React frontend for the Elections-2025 DApp with TypeScript, wagmi, viem, and Wallet Connect integration.

## Tech Stack (Fixed)
- **Framework**: React + Vite + TypeScript
- **Ethereum Integration**: wagmi v2 + viem v2
- **Wallet Connection**: WalletConnect v2 (MetaMask primary)
- **Styling**: Tailwind CSS (recommended) or styled-components
- **State Management**: Zustand or React Context + useReducer
- **Build Tool**: Vite
- **Package Manager**: npm (to match backend)

## Contract Integration

### Contract Addresses & ABIs
- Contracts deployed via Hardhat scripts in `/scripts/`
- ABIs auto-generated in `/typechain-types/` after compilation
- Use wagmi's `useContract` and `useContractRead/Write` hooks

### Key Contract Functions

#### Election.sol
```typescript
// Core voting functions
voteDirect(candidateId: bigint, proof: `0x${string}`[])
voteByQuiz(answers: [number, number, number], proof: `0x${string}`[])

// View functions
getCandidates() -> Candidate[]
getElectionInfo() -> ElectionConfig
isEligibleVoter(address, proof) -> boolean
getElectionStatus() -> string
getRanking() -> [candidateIds[], voteCounts[]]
hasVoted(address) -> boolean

// Admin functions (owner only)
createElection(name, description, startTime, endTime, merkleRoot, questionnaireEnabled)
addCandidate(name, description, questionnaireProfile)
```

#### BalToken.sol
```typescript
// Token functions
balanceOf(address) -> bigint
totalSupply() -> bigint
getVoteReward() -> bigint (1 BAL = 1e18)
```

## Frontend Architecture

### Directory Structure
```
web/
├── src/
│   ├── components/
│   │   ├── admin/          # Admin panel components
│   │   ├── voter/          # Voter interface components
│   │   ├── common/         # Shared components
│   │   └── layout/         # Layout components
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Utility functions
│   ├── types/              # TypeScript type definitions
│   ├── constants/          # App constants
│   └── assets/             # Static assets
├── public/
└── package.json
```

### Component Naming Conventions
- **PascalCase** for component names: `VotingPanel`, `CandidateCard`
- **camelCase** for props and variables: `candidateId`, `merkleProof`
- **SCREAMING_SNAKE_CASE** for constants: `ELECTION_STATUS`, `VOTE_REWARD`

### Type Definitions

```typescript
// Core types matching Solidity structs
interface Candidate {
  id: bigint;
  name: string;
  description: string;
  voteCount: bigint;
  isActive: boolean;
  questionnaireProfile: [number, number, number];
}

interface ElectionConfig {
  name: string;
  description: string;
  startTime: bigint;
  endTime: bigint;
  voterMerkleRoot: `0x${string}`;
  isActive: boolean;
  resultsPublished: boolean;
  maxCandidates: bigint;
  questionnaireEnabled: boolean;
}

// Frontend-specific types
interface VoterProfile {
  answers: [number, number, number]; // 0-10 scale
  topics: ['Economic Policy', 'Social Issues', 'Security Policy'];
}

interface MerkleProofData {
  address: `0x${string}`;
  proof: `0x${string}`[];
}
```

## UI/UX Guidelines

### User Flows

#### Admin Flow
1. **Election Setup**: Create election → Add candidates → Set timing
2. **Election Management**: Monitor votes → End election → Publish results
3. **Voter Management**: Update Merkle root → Verify voter eligibility

#### Voter Flow
1. **Connect Wallet**: MetaMask connection → Verify eligibility
2. **Vote Selection**:
   - **Direct Vote**: Browse candidates → Select → Confirm
   - **Quiz Vote**: Answer questionnaire → Get matched → Confirm
3. **Post-Vote**: View confirmation → Check BAL token reward

### Component Design Patterns

#### Voting Components
```typescript
// Direct voting component
<VotingPanel>
  <CandidateList candidates={activeCandidates} />
  <VoteConfirmation onConfirm={handleDirectVote} />
</VotingPanel>

// Quiz-based voting component
<QuizVotingPanel>
  <QuestionnaireForm onSubmit={handleQuizVote} />
  <VoteConfirmation anonymous={true} />
</QuizVotingPanel>
```

#### Admin Components
```typescript
<AdminDashboard>
  <ElectionStats />
  <CandidateManager />
  <VoterManager />
  <ResultsPanel />
</AdminDashboard>
```

### State Management Patterns

```typescript
// Election state structure
interface ElectionState {
  // Contract data
  election: ElectionConfig | null;
  candidates: Candidate[];
  userVoteStatus: {
    hasVoted: boolean;
    votedFor: bigint | null;
    balTokenReward: bigint;
  };

  // UI state
  loading: boolean;
  error: string | null;
  currentStep: 'connect' | 'verify' | 'vote' | 'confirm' | 'complete';
}
```

## Wallet Integration

### wagmi Configuration
```typescript
import { configureChains, createConfig } from 'wagmi';
import { hardhat, sepolia } from 'wagmi/chains';
import { MetaMaskConnector } from 'wagmi/connectors/metaMask';

const { chains, publicClient } = configureChains(
  [hardhat, sepolia],
  [/* providers */]
);

export const config = createConfig({
  connectors: [new MetaMaskConnector({ chains })],
  publicClient,
});
```

### Contract Interaction Patterns
```typescript
// Reading contract data
const { data: candidates } = useContractRead({
  address: ELECTION_ADDRESS,
  abi: ElectionABI,
  functionName: 'getCandidates',
});

// Writing to contract
const { write: voteDirect } = useContractWrite({
  address: ELECTION_ADDRESS,
  abi: ElectionABI,
  functionName: 'voteDirect',
  onSuccess: (data) => {
    // Handle success
    toast.success('Vote cast successfully!');
  },
});
```

## Security Considerations

### Input Validation
- Validate questionnaire answers (0-10 range)
- Sanitize candidate names and descriptions
- Verify Merkle proofs client-side before submission

### Error Handling
```typescript
// Contract error handling
const handleContractError = (error: Error) => {
  if (error.message.includes('AlreadyVoted')) {
    return 'You have already voted in this election.';
  }
  if (error.message.includes('InvalidMerkleProof')) {
    return 'You are not eligible to vote in this election.';
  }
  return 'An unexpected error occurred. Please try again.';
};
```

### Privacy Protection
- Quiz voting: Never expose candidate selection to user
- Merkle proofs: Generate client-side, don't store
- Wallet addresses: Display abbreviated format (0x1234...5678)

## Environment Configuration

### Environment Variables
```env
# Contract addresses (different per network)
VITE_ELECTION_ADDRESS=0x...
VITE_BAL_TOKEN_ADDRESS=0x...

# Network configuration
VITE_CHAIN_ID=31337  # Hardhat local
VITE_RPC_URL=http://localhost:8545

# Feature flags
VITE_QUESTIONNAIRE_ENABLED=true
VITE_ADMIN_MODE=false
```

### Network Support
- **Development**: Hardhat local network (chainId: 31337)
- **Testing**: Sepolia testnet (chainId: 11155111)
- Auto-detect network and show appropriate UI

## Testing Strategy

### Component Testing
- React Testing Library for component tests
- Mock wagmi hooks for contract interactions
- Test both admin and voter user flows

### Integration Testing
- Cypress or Playwright for E2E tests
- Test wallet connection flow
- Test complete voting process

## Deployment

### Build Configuration
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "lint": "eslint src --ext ts,tsx"
  }
}
```

### Production Considerations
- Bundle size optimization
- Contract ABI bundling strategy
- CDN asset delivery
- Environment-specific contract addresses

## Code Style

### Formatting
- **Prettier** for code formatting
- **ESLint** with TypeScript rules
- 2-space indentation
- Single quotes for strings
- Trailing commas

### Import Organization
```typescript
// External libraries
import React from 'react';
import { useAccount, useContractRead } from 'wagmi';

// Internal utilities
import { formatAddress, calculateL1Distance } from '@/utils';

// Components
import { CandidateCard, VotingButton } from '@/components';

// Types
import type { Candidate, VoterProfile } from '@/types';
```

### Comments & Documentation
- JSDoc comments for custom hooks
- Inline comments for complex blockchain logic
- README.md with setup instructions

## Integration Points

### Backend Communication
- No traditional API calls (blockchain-only)
- Event listening for contract events
- IPFS integration for large data (future consideration)

### External Services
- MetaMask wallet detection
- Block explorer links for transactions
- Token price APIs (optional BAL token value)

This document should be provided to v0 to ensure consistent development patterns aligned with the Elections-2025 DApp architecture.