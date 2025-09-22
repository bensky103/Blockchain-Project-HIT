# Elections-2025 DApp

A decentralized election application built on Ethereum with Merkle tree voter verification and ERC-20 token rewards.

## Features

- **Admin Interface**: Election management and configuration
- **Candidate Management**: Registration and profile management
- **Merkle Tree Verification**: Secure voter eligibility verification
- **Timed Voting**: Configurable voting periods
- **Results Ranking**: Transparent vote counting and ranking
- **Token Rewards**: BAL token rewards for successful voting
- **Anonymous Selection**: Optional questionnaire-based candidate matching

## Tech Stack

- **Smart Contracts**: Solidity 0.8.20, Hardhat, OpenZeppelin
- **Testing**: Hardhat, Mocha/Chai, TypeScript
- **Frontend**: React, Vite, TypeScript, wagmi, viem
- **Wallet Integration**: MetaMask
- **Utilities**: merkletreejs, dotenv

## Project Structure

```
├── contracts/          # Solidity smart contracts
├── scripts/            # Deployment and utility scripts
├── test/              # Smart contract tests
├── web/               # React frontend application
├── tools/             # Development tools (Merkle tree generator)
├── docs/              # Project documentation
├── .editorconfig      # Editor configuration
├── .gitignore         # Git ignore rules
├── hardhat.config.ts  # Hardhat configuration
├── package.json       # Node.js dependencies
└── tsconfig.json      # TypeScript configuration
```

## Quick Start

### Prerequisites

- Node.js LTS (18.x or 20.x)
- npm or pnpm
- Git
- MetaMask browser extension

### Installation

```cmd
rem Install dependencies
npm install

rem Install web dependencies
cd web && npm install && cd ..

rem Copy environment file (Windows)
copy .env.example .env
```

### Development

```cmd
rem Start Hardhat network (run in separate terminal)
npx hardhat node

rem Compile contracts
npx hardhat compile

rem Run tests
npx hardhat test

rem Start frontend development server
npm run dev:web
```

### Testing

#### Smart Contract Tests
```cmd
rem Run all contract tests
npx hardhat test

rem Run tests with gas reporting
set REPORT_GAS=true && npx hardhat test

rem Run tests with coverage
npx hardhat coverage

rem Clean and recompile before testing
npx hardhat clean && npx hardhat compile && npx hardhat test
```

#### Frontend Tests
```cmd
rem Navigate to web directory
cd web

rem Run TypeScript checking
npm run typecheck

rem Run ESLint checking
npm run lint

rem Build verification
npm run build

rem Return to root
cd ..
```

#### Environment Verification
```cmd
rem Check Node.js version (should be 18.x or 20.x LTS)
node --version

rem Check npm version
npm --version

rem Check Git version
git --version

rem Verify VSCode extensions (run in VSCode terminal)
code --list-extensions | findstr "solidity prettier eslint editorconfig"
```

### Deployment

```cmd
rem Deploy to local network
npm run deploy:local

rem Deploy to Sepolia testnet (configure .env first)
npm run deploy:sepolia
```

## Smart Contracts

- **Election.sol**: Main election contract with Merkle tree voter verification
- **BalToken.sol**: ERC-20 reward token (BAL)

## Documentation

- [Architecture Overview](docs/architecture.md)
- [Development Log](docs/summary.md)

## License

MIT