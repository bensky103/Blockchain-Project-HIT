import React from 'react';
import { useAccount, useConnect, useDisconnect, useChainId } from 'wagmi';
import { metaMask } from 'wagmi/connectors';
import { Wallet, LogOut, AlertCircle } from 'lucide-react';

export function WalletConnection() {
  const { address, isConnected } = useAccount();
  const { connect, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();

  const handleConnect = () => {
    connect({ connector: metaMask() });
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getNetworkName = (chainId: number) => {
    switch (chainId) {
      case 31337:
        return 'Localhost';
      case 11155111:
        return 'Sepolia';
      default:
        return 'Unknown';
    }
  };

  if (isConnected && address) {
    return (
      <div className="wallet-connected">
        <div className="wallet-info">
          <Wallet className="wallet-icon" size={20} />
          <div className="wallet-details">
            <span className="wallet-address">{formatAddress(address)}</span>
            <span className="wallet-network">{getNetworkName(chainId)}</span>
          </div>
        </div>
        <button 
          onClick={() => disconnect()} 
          className="disconnect-button"
          title="Disconnect Wallet"
        >
          <LogOut size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="wallet-connection">
      <button 
        onClick={handleConnect} 
        disabled={isPending}
        className="connect-button"
      >
        <Wallet size={20} />
        {isPending ? 'Connecting...' : 'Connect MetaMask'}
      </button>
      
      {error && (
        <div className="connection-error">
          <AlertCircle size={16} />
          <span>Failed to connect: {error.message}</span>
        </div>
      )}
    </div>
  );
}