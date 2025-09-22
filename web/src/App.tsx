import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAccount } from 'wagmi'
import './App.css'

// Components
import { WalletConnection } from './components/WalletConnection'
import { AdminDashboard } from './components/AdminDashboard'
import { VoterInterface } from './components/VoterInterface'
import { ResultsDashboard } from './components/ResultsDashboard'

// Navigation component
function Navigation({ userType, setUserType }: { userType: string, setUserType: (type: string) => void }) {
  return (
    <nav className="navigation">
      <div className="nav-links">
        <button 
          className={userType === 'admin' ? 'nav-button active' : 'nav-button'}
          onClick={() => setUserType('admin')}
        >
          Admin
        </button>
        <button 
          className={userType === 'voter' ? 'nav-button active' : 'nav-button'}
          onClick={() => setUserType('voter')}
        >
          Vote
        </button>
        <button 
          className={userType === 'results' ? 'nav-button active' : 'nav-button'}
          onClick={() => setUserType('results')}
        >
          Results
        </button>
      </div>
    </nav>
  )
}

function App() {
  const { isConnected } = useAccount()
  const [userType, setUserType] = useState<'admin' | 'voter' | 'results'>('voter')

  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <div className="header-content">
            <div className="header-title">
              <h1>Elections 2025</h1>
              <p>Decentralized Election Platform</p>
            </div>
            <WalletConnection />
          </div>
          {isConnected && (
            <Navigation userType={userType} setUserType={setUserType} />
          )}
        </header>

        <main className="main-content">
          {!isConnected ? (
            <div className="welcome-section">
              <h2>Welcome to Elections 2025</h2>
              <p>A secure, transparent, and decentralized voting platform built on Ethereum.</p>
              <ul className="features">
                <li>✓ Merkle tree voter verification</li>
                <li>✓ Anonymous quiz-based voting option</li>
                <li>✓ BAL token rewards for participation</li>
                <li>✓ Real-time results tracking</li>
              </ul>
              <p className="connect-prompt">Connect your MetaMask wallet to participate</p>
            </div>
          ) : (
            <Routes>
              <Route 
                path="/" 
                element={
                  userType === 'admin' ? <AdminDashboard /> :
                  userType === 'voter' ? <VoterInterface /> :
                  <ResultsDashboard />
                } 
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          )}
        </main>

        <footer className="app-footer">
          <p>Built with Solidity + Hardhat + React + wagmi</p>
        </footer>
      </div>
    </Router>
  )
}

export default App