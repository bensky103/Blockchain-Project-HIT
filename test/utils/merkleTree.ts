import { MerkleTree } from "merkletreejs";
import { keccak256 } from "ethers";

export interface VoterData {
  address: string;
}

export class MerkleTreeHelper {
  private tree: MerkleTree;
  private leaves: string[];

  constructor(voters: string[]) {
    this.leaves = voters.map(address => keccak256(address));
    this.tree = new MerkleTree(this.leaves, keccak256, { sortPairs: true });
  }

  getRoot(): string {
    return this.tree.getHexRoot();
  }

  getProof(address: string): string[] {
    const leaf = keccak256(address);
    return this.tree.getHexProof(leaf);
  }

  verify(address: string, proof: string[]): boolean {
    const leaf = keccak256(address);
    return this.tree.verify(proof, leaf, this.tree.getRoot());
  }

  static createFromAddresses(addresses: string[]): MerkleTreeHelper {
    return new MerkleTreeHelper(addresses);
  }
}