#!/usr/bin/env ts-node

import * as fs from "fs";
import * as path from "path";
import { MerkleTree } from "merkletreejs";
import { ethers } from "ethers";

interface MerkleOutput {
    root: string;
    leaves: string[];
    proofs: { [address: string]: string[] };
}

class MerkleTreeBuilder {
  private readonly inputPath: string;
  private readonly outputPath: string;
  private validAddresses: string[] = [];
  private rejectedLines: string[] = [];

  constructor(inputPath: string = "tools/voters.csv", outputPath: string = "tools/out/merkle.json") {
    this.inputPath = path.resolve(inputPath);
    this.outputPath = path.resolve(outputPath);
  }

  /**
     * Validates and checksums an Ethereum address
     */
  private validateAndChecksum(address: string): string | null {
    try {
      // Remove whitespace and normalize
      const cleanAddress = address.trim();

      // Check if it's a valid Ethereum address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(cleanAddress)) {
        return null;
      }

      // Use ethers to validate and checksum
      return ethers.getAddress(cleanAddress);
    } catch (error) {
      return null;
    }
  }

  /**
     * Reads and processes the CSV file
     */
  private processCSV(): void {
    if (!fs.existsSync(this.inputPath)) {
      throw new Error(`Input file not found: ${this.inputPath}`);
    }

    const content = fs.readFileSync(this.inputPath, "utf-8");
    const lines = content.split("\n").map(line => line.trim()).filter(line => line.length > 0);

    if (lines.length === 0) {
      throw new Error("CSV file is empty");
    }

    let startIndex = 0;
    const firstLine = lines[0].toLowerCase();

    // Check if first line is a header
    if (firstLine === "address" || firstLine.includes("address")) {
      startIndex = 1;
      console.log("📄 Header detected, skipping first line");
    }

    const addressSet = new Set<string>();

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Handle CSV format (take first column if comma-separated)
      const address = line.includes(",") ? line.split(",")[0].trim() : line.trim();

      if (!address) {
        this.rejectedLines.push(`Line ${lineNumber}: Empty address`);
        continue;
      }

      const checksummedAddress = this.validateAndChecksum(address);

      if (!checksummedAddress) {
        this.rejectedLines.push(`Line ${lineNumber}: Invalid address format - ${address}`);
        continue;
      }

      // Check for duplicates
      if (addressSet.has(checksummedAddress)) {
        this.rejectedLines.push(`Line ${lineNumber}: Duplicate address - ${checksummedAddress}`);
        continue;
      }

      addressSet.add(checksummedAddress);
      this.validAddresses.push(checksummedAddress);
    }

    console.log(`✅ Processed ${lines.length - startIndex} lines`);
    console.log(`✅ Valid addresses: ${this.validAddresses.length}`);

    if (this.rejectedLines.length > 0) {
      console.log(`⚠️  Rejected lines: ${this.rejectedLines.length}`);
      this.rejectedLines.forEach(rejection => console.log(`   ${rejection}`));
    }

    if (this.validAddresses.length === 0) {
      throw new Error("No valid addresses found in the CSV file");
    }
  }

  /**
     * Builds the Merkle tree and generates proofs
     */
  private buildMerkleTree(): MerkleOutput {
    console.log("🌳 Building Merkle tree...");

    // Create leaf nodes by hashing each address
    const leaves = this.validAddresses.map(address =>
      ethers.keccak256(ethers.solidityPacked(["address"], [address]))
    );

    // Build the Merkle tree
    const tree = new MerkleTree(leaves, ethers.keccak256, { sortPairs: true });
    const root = tree.getHexRoot();

    console.log(`🌳 Merkle root: ${root}`);
    console.log(`🍃 Total leaves: ${leaves.length}`);

    // Generate proofs for each address
    const proofs: { [address: string]: string[] } = {};

    for (let i = 0; i < this.validAddresses.length; i++) {
      const address = this.validAddresses[i];
      const leaf = leaves[i];
      const proof = tree.getHexProof(leaf);
      proofs[address] = proof;
    }

    return {
      root,
      leaves,
      proofs
    };
  }

  /**
     * Saves the Merkle tree data to JSON file
     */
  private saveOutput(merkleData: MerkleOutput): void {
    // Ensure output directory exists
    const outputDir = path.dirname(this.outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write JSON file with proper formatting
    fs.writeFileSync(this.outputPath, JSON.stringify(merkleData, null, 2));
    console.log(`💾 Merkle tree saved to: ${this.outputPath}`);
  }

  /**
     * Main execution method
     */
  public async build(): Promise<void> {
    try {
      console.log("🚀 Starting Merkle tree generation...");
      console.log(`📁 Input file: ${this.inputPath}`);
      console.log(`📁 Output file: ${this.outputPath}`);
      console.log("");

      // Process CSV and validate addresses
      this.processCSV();
      console.log("");

      // Build Merkle tree and generate proofs
      const merkleData = this.buildMerkleTree();
      console.log("");

      // Save to output file
      this.saveOutput(merkleData);
      console.log("");

      console.log("✅ Merkle tree generation completed successfully!");
      console.log("📊 Summary:");
      console.log(`   - Valid addresses: ${this.validAddresses.length}`);
      console.log(`   - Rejected lines: ${this.rejectedLines.length}`);
      console.log(`   - Merkle root: ${merkleData.root}`);
      console.log(`   - Output file: ${this.outputPath}`);

    } catch (error) {
      console.error("❌ Error building Merkle tree:", error);
      process.exit(1);
    }
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);

  // Parse command line arguments
  let inputPath = "tools/voters.csv";
  let outputPath = "tools/out/merkle.json";

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
    case "--input":
    case "-i":
      inputPath = args[i + 1];
      i++;
      break;
    case "--output":
    case "-o":
      outputPath = args[i + 1];
      i++;
      break;
    case "--help":
    case "-h":
      console.log(`
Usage: ts-node tools/buildMerkleTree.ts [options]

Options:
  -i, --input <path>   Input CSV file path (default: tools/voters.csv)
  -o, --output <path>  Output JSON file path (default: tools/out/merkle.json)
  -h, --help          Show this help message

Example:
  ts-node tools/buildMerkleTree.ts
  ts-node tools/buildMerkleTree.ts --input custom-voters.csv --output custom-merkle.json
                `);
      return;
    }
  }

  const builder = new MerkleTreeBuilder(inputPath, outputPath);
  await builder.build();
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { MerkleTreeBuilder };