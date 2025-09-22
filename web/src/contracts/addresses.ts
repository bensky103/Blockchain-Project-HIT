// Contract addresses for different networks
export const CONTRACTS = {
  localhost: {
    balToken: '0xA51c1fc2f0D1a1b8494Ed1FE312d7C3a78Ed91C0' as `0x${string}`,
    election: '0x0DCd1Bf9A1b36cE34237eEaFef220932846BCD82' as `0x${string}`,
  },
  sepolia: {
    balToken: '' as `0x${string}`,
    election: '' as `0x${string}`,
  },
} as const;

export type NetworkName = keyof typeof CONTRACTS;

// Get contracts for current network
export function getContracts(network: NetworkName = 'localhost') {
  return CONTRACTS[network];
}

// Hardhat localhost configuration
export const LOCALHOST_CHAIN_ID = 31337;