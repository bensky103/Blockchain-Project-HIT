// Contract type definitions and utility functions
import { ElectionABI } from './ElectionABI';
import { BalTokenABI } from './BalTokenABI';
import { getContracts, NetworkName } from './addresses';

export { ElectionABI, BalTokenABI, getContracts };
export type { NetworkName };

// Election Status Enum
export enum ElectionStatus {
  Scheduled = 0,
  Active = 1,
  Ended = 2,
  Completed = 3
}

// Type definitions for contract interactions
export interface Candidate {
  name: string;
  description: string;
  voteCount: bigint;
  isActive: boolean;
  questionnaire: readonly [number, number, number];
}

export interface ElectionInfo {
  name: string;
  description: string;
  startTime: bigint;
  endTime: bigint;
  status: ElectionStatus;
  totalCandidates: bigint;
}

export interface VoteResult {
  candidateIds: readonly bigint[];
  voteCounts: readonly bigint[];
}

// Merkle tree data structure
export interface MerkleTreeData {
  root: `0x${string}`;
  leaves: `0x${string}`[];
  proofs: Record<string, `0x${string}`[]>;
}

// Helper function to get current network
export function getCurrentNetwork(): NetworkName {
  const ethereum = (window as any).ethereum;
  const chainId = ethereum?.chainId;
  if (chainId === '0x7a69') return 'localhost'; // 31337 in hex
  if (chainId === '0xaa36a7') return 'sepolia'; // 11155111 in hex
  return 'localhost'; // default
}

// Format vote count for display
export function formatVoteCount(count: bigint): string {
  return count.toString();
}

// Format BAL token amount (18 decimals)
export function formatBALAmount(amount: bigint): string {
  return (Number(amount) / 1e18).toFixed(2);
}

// Election status helpers
export function getElectionStatusText(status: ElectionStatus): string {
  switch (status) {
    case ElectionStatus.Scheduled:
      return 'Scheduled';
    case ElectionStatus.Active:
      return 'Active';
    case ElectionStatus.Ended:
      return 'Ended';
    case ElectionStatus.Completed:
      return 'Completed';
    default:
      return 'Unknown';
  }
}

export function isElectionActive(status: ElectionStatus): boolean {
  return status === ElectionStatus.Active;
}

export function canVote(status: ElectionStatus): boolean {
  return status === ElectionStatus.Active;
}

// Time formatting utilities
export function formatTimestamp(timestamp: bigint): string {
  return new Date(Number(timestamp) * 1000).toLocaleString();
}

export function getTimeRemaining(endTime: bigint): string {
  const now = Math.floor(Date.now() / 1000);
  const remaining = Number(endTime) - now;
  
  if (remaining <= 0) return 'Ended';
  
  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  return `${minutes}m remaining`;
}