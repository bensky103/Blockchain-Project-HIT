import { http, createConfig } from 'wagmi';
import { hardhat, sepolia } from 'wagmi/chains';
import { metaMask } from 'wagmi/connectors';

// Define custom hardhat chain with correct configuration
const localhost = {
  ...hardhat,
  id: 31337,
  name: 'Localhost',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:8545'],
    },
  },
} as const;

// Wagmi configuration
export const config = createConfig({
  chains: [localhost, sepolia],
  connectors: [
    metaMask(),
  ],
  transports: {
    [localhost.id]: http('http://127.0.0.1:8545'),
    [sepolia.id]: http('https://sepolia.infura.io/v3/YOUR_INFURA_KEY'),
  },
});

// Export chains for easy access
export { localhost, sepolia };