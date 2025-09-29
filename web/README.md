# Elections 2025 DApp - Frontend

A decentralized voting platform built with Next.js, featuring blockchain integration and Merkle tree verification for secure, transparent elections.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm
- Web3 wallet (MetaMask, etc.)

### Installation & Setup

1. **Install dependencies**
   \`\`\`bash
   pnpm install
   \`\`\`

2. **Start development server**
   \`\`\`bash
   pnpm dev
   \`\`\`

3. **Open your browser**
   Navigate to `http://localhost:3000`

### Available Scripts
- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

## 🧭 Navigation

The application uses a tabbed interface with three main sections:

- **Vote Tab** - Participate in elections (direct voting and quiz-based voting)
- **Results Tab** - View real-time election results and export data
- **Admin Tab** - Manage elections (admin-only access)

## 👨‍💼 Admin Workflow

### Initial Setup
1. **Connect Wallet** - Connect as the contract owner
2. **Configure Election Settings**:
   - Set election start and end times
   - Configure reward amount (BAL tokens)
   - Set reward token contract address
   - Upload Merkle root for voter verification

### Candidate Management
1. **Add Candidates**:
   - Enter candidate name
   - Set policy positions (0-100 scale):
     - Economic Policy
     - Social Issues  
     - Security Policy
   - Add candidate description
2. **Review Candidates** - View all added candidates with their positions

### Election Management
- **Monitor Status** - Track election state (pending, active, ended)
- **Finalize Results** - Call `finalizeIfEnded()` when election concludes
- **Debug Panel** - Monitor transaction hashes and contract interactions

## 🗳️ Voter Workflows

### Prerequisites for Voting
- Web3 wallet connected
- Must be on the correct blockchain network
- Address must be whitelisted (included in Merkle tree)
- Election must be active

### Direct Voting
1. **View Candidates** - Browse all candidates with their policy positions
2. **Select Candidate** - Choose your preferred candidate
3. **Merkle Proof Verification**:
   - System automatically loads proof from `/public/merkle.json`
   - Manual proof input available as fallback
4. **Submit Vote** - Call `voteDirect(candidateId, proof)`
5. **Confirmation** - Receive transaction receipt and updated BAL balance

### Quiz-Based Voting
1. **Answer Policy Questions** - Use sliders (0-100) to indicate your positions:
   - Economic Policy: "What level of government intervention in the economy do you support?"
   - Social Issues: "How progressive should social policies be?"
   - Security Policy: "What priority should national security have?"
2. **Submit Quiz** - Call `voteByQuiz([a,b,c], proof)` with your answers
3. **Anonymous Results** - System matches you to best candidate without revealing choice
4. **Confirmation** - Receive "Your vote has been cast" message and updated balance

### Voting Features
- **Real-time Validation** - Instant feedback on eligibility and proof validity
- **Transaction Tracking** - Monitor pending/success/failure states with toast notifications
- **Balance Updates** - See BAL token rewards immediately after voting
- **Error Handling** - Clear messages for common issues

## 📊 Results Page

### Features
- **Live Results** - Real-time vote counts and percentages
- **Winner Highlighting** - Clear visual indication of leading candidate
- **Candidate Rankings** - Sorted by vote count with progress bars
- **Policy Positions** - View each candidate's stance on key issues
- **Election Status** - Track if election is active or finalized

### Data Export
- **CSV Export** - Download comprehensive results including:
  - Election metadata (dates, total votes, status)
  - Candidate rankings with vote counts and percentages
  - Policy positions for each candidate
  - Timestamped filename for record-keeping

### Post-Election
- **Finalization** - Admin can finalize results when election ends
- **Results Sharing** - Copy results summary to clipboard
- **Data Analysis** - Export data for external analysis tools

## 🐛 Common Errors & Troubleshooting

### Connection Issues
**"Wrong Network"**
- **Cause**: Connected to incorrect blockchain
- **Solution**: Switch to the correct network in your wallet

**"Wallet Not Connected"**
- **Cause**: No Web3 wallet connected
- **Solution**: Connect MetaMask or compatible wallet

### Permission Errors
**"Not Contract Owner"**
- **Cause**: Trying to access admin functions without owner privileges
- **Solution**: Connect with the contract owner wallet

**"Not Whitelisted"**
- **Cause**: Your address is not in the Merkle tree
- **Solution**: Contact admin to be added to whitelist

### Voting Errors
**"Invalid Merkle Proof"**
- **Cause**: Incorrect or missing proof for your address
- **Solution**: 
  - Check `/public/merkle.json` contains your address
  - Verify proof format is correct
  - Try manual proof input

**"Already Voted"**
- **Cause**: Address has already cast a vote
- **Solution**: Each address can only vote once per election

**"Election Not Active"**
- **Cause**: Trying to vote outside election window
- **Solution**: Wait for election start or check if election has ended

**"Insufficient Gas"**
- **Cause**: Not enough ETH for transaction fees
- **Solution**: Add ETH to your wallet for gas fees

### Transaction Issues
**"Transaction Failed"**
- **Cause**: Various blockchain-related issues
- **Solution**: 
  - Check gas limits
  - Verify contract parameters
  - Try again with higher gas price
  - Check Debug Panel for transaction details

**"Pending Transaction"**
- **Cause**: Transaction waiting for blockchain confirmation
- **Solution**: Wait for confirmation or speed up with higher gas

## 🔧 Debug Panel

Located at the bottom of each page, the Debug Panel shows:
- **Last Transaction Hash** - Most recent blockchain transaction
- **Current Route** - Active navigation state
- **Contract Address** - Loaded from deployment files
- **Network Status** - Current blockchain connection

Use this panel to troubleshoot issues and verify contract interactions.

## 🎨 UI Features

### Design System
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Dark/Light Mode** - Theme switching support
- **Accessibility** - ARIA labels and keyboard navigation
- **Loading States** - Skeleton loaders and progress indicators

### User Experience
- **Toast Notifications** - Real-time feedback for all actions
- **Input Validation** - Form validation with helpful error messages
- **Error Banners** - Clear error communication with suggested solutions
- **Progress Tracking** - Visual indicators for multi-step processes

### Interactive Elements
- **Policy Sliders** - Intuitive 0-100 scale for quiz voting
- **Progress Bars** - Visual representation of vote percentages
- **Expandable Cards** - Detailed candidate information
- **Copy to Clipboard** - Easy sharing of results and data

## 🔐 Security Features

- **Merkle Tree Verification** - Cryptographic proof of voter eligibility
- **Blockchain Integration** - Immutable vote recording
- **Owner-Only Functions** - Admin controls restricted to contract owner
- **Input Sanitization** - Protection against malicious inputs
- **Transaction Validation** - Comprehensive error checking before submission

---

For backend setup, smart contract deployment, and API documentation, see the respective sections of this README.
