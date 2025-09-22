import { MerkleTree } from "merkletreejs";
import { keccak256, isAddress } from "ethers";
import * as fs from "fs";
import * as path from "path";

interface VoterEntry {
  address: string;
  name?: string;
  email?: string;
}

interface VoterProof {
  address: string;
  proof: string[];
  name?: string;
  email?: string;
}

interface GeneratedVoterList {
  merkleRoot: string;
  totalVoters: number;
  voterProofs: VoterProof[];
  generatedAt: string;
}

/**
 * Parse CSV file to extract voter addresses
 * Expected CSV format: address,name,email (name and email are optional)
 */
function parseCsvFile(csvPath: string): VoterEntry[] {
  if (!fs.existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split('\n').filter(line => line.trim());

  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }

  // Skip header if it contains 'address'
  const startIndex = lines[0].toLowerCase().includes('address') ? 1 : 0;
  const voterEntries: VoterEntry[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const parts = lines[i].split(',').map(part => part.trim());

    if (parts.length === 0 || !parts[0]) {
      continue; // Skip empty lines
    }

    const address = parts[0];

    // Validate Ethereum address
    if (!isAddress(address)) {
      console.warn(`⚠️  Invalid address on line ${i + 1}: ${address}`);
      continue;
    }

    voterEntries.push({
      address: address.toLowerCase(), // Normalize to lowercase
      name: parts[1] || undefined,
      email: parts[2] || undefined
    });
  }

  return voterEntries;
}

/**
 * Generate Merkle tree from voter addresses
 */
function generateMerkleTree(voters: VoterEntry[]): { tree: MerkleTree; root: string } {
  if (voters.length === 0) {
    throw new Error('No valid voters found');
  }

  // Create leaves from voter addresses
  const leaves = voters.map(voter => keccak256(voter.address));

  // Create Merkle tree with sorted pairs for deterministic results
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  const root = tree.getHexRoot();

  return { tree, root };
}

/**
 * Generate individual proofs for each voter
 */
function generateProofs(voters: VoterEntry[], tree: MerkleTree): VoterProof[] {
  return voters.map(voter => {
    const leaf = keccak256(voter.address);
    const proof = tree.getHexProof(leaf);

    return {
      address: voter.address,
      proof,
      name: voter.name,
      email: voter.email
    };
  });
}

/**
 * Main function to generate voter list and proofs
 */
export function generateVoterList(csvPath: string, outputDir: string = './output'): GeneratedVoterList {
  console.log("🔧 Generating voter list from CSV...");
  console.log("CSV Path:", csvPath);

  // Parse CSV file
  const voters = parseCsvFile(csvPath);
  console.log(`📋 Found ${voters.length} valid voters`);

  if (voters.length === 0) {
    throw new Error('No valid voters found in CSV file');
  }

  // Remove duplicates
  const uniqueVoters = voters.filter((voter, index, array) =>
    array.findIndex(v => v.address === voter.address) === index
  );

  if (uniqueVoters.length !== voters.length) {
    console.log(`⚠️  Removed ${voters.length - uniqueVoters.length} duplicate addresses`);
  }

  // Generate Merkle tree
  const { tree, root } = generateMerkleTree(uniqueVoters);
  console.log("🌳 Merkle root:", root);

  // Generate individual proofs
  const voterProofs = generateProofs(uniqueVoters, tree);

  const result: GeneratedVoterList = {
    merkleRoot: root,
    totalVoters: uniqueVoters.length,
    voterProofs,
    generatedAt: new Date().toISOString()
  };

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save results to files
  const outputPath = path.join(outputDir, 'voterList.json');
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log("💾 Voter list saved to:", outputPath);

  // Save just the Merkle root for easy access
  const rootPath = path.join(outputDir, 'merkleRoot.txt');
  fs.writeFileSync(rootPath, root);
  console.log("📄 Merkle root saved to:", rootPath);

  // Save individual proof files for each voter (for web app)
  const proofsDir = path.join(outputDir, 'proofs');
  if (!fs.existsSync(proofsDir)) {
    fs.mkdirSync(proofsDir);
  }

  voterProofs.forEach((voterProof, index) => {
    const proofFileName = `${voterProof.address}.json`;
    const proofFilePath = path.join(proofsDir, proofFileName);
    fs.writeFileSync(proofFilePath, JSON.stringify(voterProof, null, 2));
  });
  console.log(`📁 Individual proof files saved to: ${proofsDir}`);

  console.log("\n✅ Voter list generation complete!");
  console.log("📊 Summary:");
  console.log(`   • Total voters: ${result.totalVoters}`);
  console.log(`   • Merkle root: ${result.merkleRoot}`);
  console.log(`   • Output directory: ${outputDir}`);

  return result;
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log("📖 Usage:");
    console.log("  npm run generate-voters <csv-path> [output-dir]");
    console.log("  npx ts-node tools/generateVoterList.ts <csv-path> [output-dir]");
    console.log("");
    console.log("📋 CSV Format:");
    console.log("  address,name,email");
    console.log("  0x742d35Cc6664C02C3e5f67AE3e64EEd6Ad3e86BD,John Doe,john@example.com");
    console.log("  0x8ba1f109551bD432803012645Hac136c80bDB2b,Jane Smith,jane@example.com");
    console.log("");
    console.log("📁 Output Files:");
    console.log("  • voterList.json - Complete voter list with proofs");
    console.log("  • merkleRoot.txt - Just the Merkle root");
    console.log("  • proofs/ - Individual proof files for each voter");
    return;
  }

  const csvPath = args[0];
  const outputDir = args[1] || './output';

  try {
    generateVoterList(csvPath, outputDir);
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  main();
}