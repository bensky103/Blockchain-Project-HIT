import { MerkleTreeData } from '../contracts';

let merkleData: MerkleTreeData | null = null;

/**
 * Load Merkle tree data from the public directory
 */
export async function loadMerkleTreeData(): Promise<MerkleTreeData | null> {
  try {
    if (merkleData) {
      return merkleData; // Return cached data
    }

    const response = await fetch('/merkle.json');
    if (!response.ok) {
      throw new Error(`Failed to load Merkle data: ${response.status}`);
    }

    const data = await response.json();
    
    // Validate the data structure
    if (!data.root || !data.proofs || !data.leaves) {
      throw new Error('Invalid Merkle data structure');
    }

    merkleData = data as MerkleTreeData;
    return merkleData;
  } catch (error) {
    console.error('Error loading Merkle tree data:', error);
    return null;
  }
}

/**
 * Get Merkle proof for a specific address
 */
export async function getMerkleProofForAddress(address: string): Promise<`0x${string}`[] | null> {
  try {
    const data = await loadMerkleTreeData();
    if (!data) {
      return null;
    }

    // Normalize address (ensure checksum format)
    const normalizedAddress = address.toLowerCase();
    
    // Try both original and normalized formats
    let proof = data.proofs[address] || data.proofs[normalizedAddress];
    
    // Also try with checksummed version
    if (!proof) {
      const checksumAddress = toChecksumAddress(address);
      proof = data.proofs[checksumAddress];
    }

    return proof || null;
  } catch (error) {
    console.error('Error getting Merkle proof:', error);
    return null;
  }
}

/**
 * Check if an address is eligible to vote (has a Merkle proof)
 */
export async function isEligibleVoter(address: string): Promise<boolean> {
  const proof = await getMerkleProofForAddress(address);
  return proof !== null && proof.length > 0;
}

/**
 * Get the Merkle root
 */
export async function getMerkleRoot(): Promise<`0x${string}` | null> {
  try {
    const data = await loadMerkleTreeData();
    return data?.root || null;
  } catch (error) {
    console.error('Error getting Merkle root:', error);
    return null;
  }
}

/**
 * Simple checksum address implementation
 */
function toChecksumAddress(address: string): string {
  const cleanAddress = address.toLowerCase().replace('0x', '');
  let checksumAddress = '0x';
  
  for (let i = 0; i < cleanAddress.length; i++) {
    const char = cleanAddress[i];
    if (parseInt(char, 16) >= 8) {
      checksumAddress += char.toUpperCase();
    } else {
      checksumAddress += char;
    }
  }
  
  return checksumAddress;
}

/**
 * Get all eligible voter addresses
 */
export async function getEligibleVoters(): Promise<string[]> {
  try {
    const data = await loadMerkleTreeData();
    if (!data) {
      return [];
    }

    return Object.keys(data.proofs);
  } catch (error) {
    console.error('Error getting eligible voters:', error);
    return [];
  }
}

/**
 * Get voter statistics
 */
export async function getVoterStats(): Promise<{
  totalEligible: number;
  merkleRoot: string | null;
  hasData: boolean;
}> {
  try {
    const data = await loadMerkleTreeData();
    
    return {
      totalEligible: data ? Object.keys(data.proofs).length : 0,
      merkleRoot: data?.root || null,
      hasData: data !== null,
    };
  } catch (error) {
    console.error('Error getting voter stats:', error);
    return {
      totalEligible: 0,
      merkleRoot: null,
      hasData: false,
    };
  }
}