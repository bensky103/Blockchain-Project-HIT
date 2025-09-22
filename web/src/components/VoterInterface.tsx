import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Vote, Users, Brain, Award, AlertCircle, CheckCircle } from 'lucide-react';
import { ElectionABI, BalTokenABI, getContracts, ElectionStatus, getElectionStatusText, canVote } from '../contracts';

interface Candidate {
  id: number;
  name: string;
  description: string;
  voteCount: number;
  isActive: boolean;
  questionnaire: [number, number, number];
}

export function VoterInterface() {
  const { address } = useAccount();
  const contracts = getContracts('localhost');
  
  // State
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
  const [votingMode, setVotingMode] = useState<'direct' | 'quiz'>('direct');
  const [quizAnswers, setQuizAnswers] = useState<[number, number, number]>([5, 5, 5]);
  const [merkleProof, setMerkleProof] = useState<`0x${string}`[]>([]);

  // Contract reads
  const { data: electionName } = useReadContract({
    address: contracts.election,
    abi: ElectionABI,
    functionName: 'electionName',
  });

  const { data: electionStatus } = useReadContract({
    address: contracts.election,
    abi: ElectionABI,
    functionName: 'getElectionStatus',
  });

  const { data: hasVoted } = useReadContract({
    address: contracts.election,
    abi: ElectionABI,
    functionName: 'hasVoted',
    args: address ? [address] : undefined,
  });

  const { data: balBalance } = useReadContract({
    address: contracts.balToken,
    abi: BalTokenABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const { data: totalCandidates } = useReadContract({
    address: contracts.election,
    abi: ElectionABI,
    functionName: 'totalCandidates',
  });

  // Contract writes
  const { 
    writeContract: voteDirect, 
    isPending: isVotingDirect,
    data: voteDirectHash 
  } = useWriteContract();

  const { 
    writeContract: voteByQuiz, 
    isPending: isVotingQuiz,
    data: voteQuizHash 
  } = useWriteContract();

  // Transaction receipts
  const { isLoading: isDirectVoteConfirming } = useWaitForTransactionReceipt({
    hash: voteDirectHash,
  });

  const { isLoading: isQuizVoteConfirming } = useWaitForTransactionReceipt({
    hash: voteQuizHash,
  });

  // Load Merkle proof for current user
  useEffect(() => {
    const loadMerkleProof = async () => {
      if (!address) return;
      
      try {
        const { getMerkleProofForAddress } = await import('../services/merkleService');
        const proof = await getMerkleProofForAddress(address);
        
        if (proof && proof.length > 0) {
          setMerkleProof(proof);
        } else {
          console.warn(`No Merkle proof found for address ${address}`);
          setMerkleProof([]);
        }
      } catch (error) {
        console.error('Failed to load Merkle proof:', error);
        setMerkleProof([]);
      }
    };

    loadMerkleProof();
  }, [address]);

  // Load candidates
  useEffect(() => {
    const loadCandidates = async () => {
      if (!totalCandidates) return;
      
      const candidateList: Candidate[] = [];
      for (let i = 1; i <= Number(totalCandidates); i++) {
        try {
          // This would need actual contract calls to get candidate details
          candidateList.push({
            id: i,
            name: `Candidate ${i}`,
            description: `Platform and vision for candidate ${i}`,
            voteCount: 0,
            isActive: true,
            questionnaire: [Math.floor(Math.random() * 11), Math.floor(Math.random() * 11), Math.floor(Math.random() * 11)] as [number, number, number]
          });
        } catch (error) {
          console.error(`Failed to load candidate ${i}:`, error);
        }
      }
      setCandidates(candidateList);
    };

    loadCandidates();
  }, [totalCandidates]);

  const handleDirectVote = () => {
    if (!selectedCandidate || merkleProof.length === 0) {
      alert('Please select a candidate and ensure you have voting rights');
      return;
    }

    voteDirect({
      address: contracts.election,
      abi: ElectionABI,
      functionName: 'voteDirect',
      args: [BigInt(selectedCandidate), merkleProof],
    });
  };

  const handleQuizVote = () => {
    if (merkleProof.length === 0) {
      alert('Please ensure you have voting rights');
      return;
    }

    voteByQuiz({
      address: contracts.election,
      abi: ElectionABI,
      functionName: 'voteByQuiz',
      args: [quizAnswers, merkleProof],
    });
  };

  const canUserVote = canVote(electionStatus || 0) && !hasVoted && merkleProof.length > 0;
  const isVoting = isVotingDirect || isVotingQuiz || isDirectVoteConfirming || isQuizVoteConfirming;

  if (hasVoted) {
    return (
      <div className="voter-interface">
        <div className="vote-success">
          <CheckCircle size={64} className="success-icon" />
          <h2>Vote Recorded Successfully!</h2>
          <p>Thank you for participating in the election.</p>
          <div className="reward-info">
            <Award size={24} />
            <span>
              You earned 1 BAL token for voting!
            </span>
          </div>
          <div className="balance-info">
            <p>Your current BAL balance: <strong>{balBalance ? (Number(balBalance) / 1e18).toFixed(2) : '0.00'} BAL</strong></p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="voter-interface">
      <div className="voter-header">
        <h2>Cast Your Vote</h2>
        <p>Election: {electionName || 'Loading...'}</p>
        <div className="election-status">
          <span className={`status-badge status-${electionStatus}`}>
            {getElectionStatusText(electionStatus || 0)}
          </span>
        </div>
      </div>

      {!canUserVote && (
        <div className="voting-disabled">
          <AlertCircle size={24} />
          <div className="disabled-message">
            {electionStatus !== ElectionStatus.Active && (
              <p>Voting is not currently active.</p>
            )}
            {hasVoted && (
              <p>You have already voted in this election.</p>
            )}
            {merkleProof.length === 0 && (
              <p>You are not authorized to vote in this election.</p>
            )}
          </div>
        </div>
      )}

      {canUserVote && (
        <>
          {/* Voting Mode Selection */}
          <div className="voting-mode-selection">
            <h3>Choose Voting Method</h3>
            <div className="mode-options">
              <button
                className={`mode-button ${votingMode === 'direct' ? 'active' : ''}`}
                onClick={() => setVotingMode('direct')}
              >
                <Vote size={24} />
                <div className="mode-info">
                  <h4>Direct Vote</h4>
                  <p>Choose your preferred candidate directly</p>
                </div>
              </button>
              <button
                className={`mode-button ${votingMode === 'quiz' ? 'active' : ''}`}
                onClick={() => setVotingMode('quiz')}
              >
                <Brain size={24} />
                <div className="mode-info">
                  <h4>Anonymous Quiz</h4>
                  <p>Vote based on policy preferences (anonymous)</p>
                </div>
              </button>
            </div>
          </div>

          {/* Direct Voting Interface */}
          {votingMode === 'direct' && (
            <div className="direct-voting">
              <h3>Select Your Candidate</h3>
              <div className="candidates-grid">
                {candidates.filter(c => c.isActive).map((candidate) => (
                  <div 
                    key={candidate.id} 
                    className={`candidate-card ${selectedCandidate === candidate.id ? 'selected' : ''}`}
                    onClick={() => setSelectedCandidate(candidate.id)}
                  >
                    <div className="candidate-header">
                      <h4>{candidate.name}</h4>
                      <div className="candidate-votes">
                        <Users size={16} />
                        <span>{candidate.voteCount} votes</span>
                      </div>
                    </div>
                    <p className="candidate-description">{candidate.description}</p>
                    <div className="candidate-profile">
                      <label>Policy Profile:</label>
                      <div className="profile-values">
                        {candidate.questionnaire.map((value, index) => (
                          <span key={index} className="profile-value">
                            Topic {index + 1}: {value}/10
                          </span>
                        ))}
                      </div>
                    </div>
                    {selectedCandidate === candidate.id && (
                      <div className="selection-indicator">
                        <CheckCircle size={20} />
                        <span>Selected</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="vote-actions">
                <button 
                  className="vote-button"
                  onClick={handleDirectVote}
                  disabled={!selectedCandidate || isVoting}
                >
                  <Vote size={20} />
                  {isVoting ? 'Submitting Vote...' : 'Cast Vote'}
                </button>
              </div>
            </div>
          )}

          {/* Quiz Voting Interface */}
          {votingMode === 'quiz' && (
            <div className="quiz-voting">
              <h3>Policy Preference Quiz</h3>
              <p className="quiz-description">
                Answer questions about your policy preferences. Your vote will be automatically matched 
                to the candidate with the closest policy positions (anonymously).
              </p>
              
              <div className="quiz-questions">
                {quizAnswers.map((answer, index) => (
                  <div key={index} className="quiz-question">
                    <label>Topic {index + 1} Preference (0-10):</label>
                    <div className="slider-container">
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={answer}
                        onChange={(e) => {
                          const newAnswers = [...quizAnswers] as [number, number, number];
                          newAnswers[index] = parseInt(e.target.value);
                          setQuizAnswers(newAnswers);
                        }}
                        className="quiz-slider"
                      />
                      <span className="slider-value">{answer}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="quiz-info">
                <Brain size={20} />
                <p>
                  Your answers will be compared against all candidates' policy positions, 
                  and your vote will go to the closest match. The specific candidate chosen 
                  will not be revealed to you.
                </p>
              </div>

              <div className="vote-actions">
                <button 
                  className="vote-button quiz"
                  onClick={handleQuizVote}
                  disabled={isVoting}
                >
                  <Brain size={20} />
                  {isVoting ? 'Submitting Anonymous Vote...' : 'Cast Anonymous Vote'}
                </button>
              </div>
            </div>
          )}

          {/* Voting Reward Info */}
          <div className="reward-info">
            <Award size={20} />
            <span>Earn 1 BAL token for participating in this election!</span>
          </div>
        </>
      )}
    </div>
  );
}