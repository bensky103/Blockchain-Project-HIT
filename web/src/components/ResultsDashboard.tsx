import React, { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { Trophy, Users, BarChart3, Clock, Award } from 'lucide-react';
import { ElectionABI, BalTokenABI, getContracts, ElectionStatus, getElectionStatusText, formatTimestamp, getTimeRemaining } from '../contracts';

interface Candidate {
  id: number;
  name: string;
  description: string;
  voteCount: number;
  isActive: boolean;
  percentage: number;
}


export function ResultsDashboard() {
  const contracts = getContracts('localhost');
  
  // State
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [winner, setWinner] = useState<Candidate | null>(null);

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

  const { data: startTime } = useReadContract({
    address: contracts.election,
    abi: ElectionABI,
    functionName: 'startTs',
  });

  const { data: endTime } = useReadContract({
    address: contracts.election,
    abi: ElectionABI,
    functionName: 'endTs',
  });

  const { data: totalCandidates } = useReadContract({
    address: contracts.election,
    abi: ElectionABI,
    functionName: 'totalCandidates',
  });

  const { data: rankingData } = useReadContract({
    address: contracts.election,
    abi: ElectionABI,
    functionName: 'getRankedResults',
  });

  const { data: tokenTotalSupply } = useReadContract({
    address: contracts.balToken,
    abi: BalTokenABI,
    functionName: 'totalSupply',
  });

  // Process ranking data and load candidates
  useEffect(() => {
    const loadCandidatesWithResults = async () => {
      if (!totalCandidates || !rankingData) return;
      
      const [candidateIds, voteCounts] = rankingData as [readonly bigint[], readonly bigint[]];
      const candidateList: Candidate[] = [];
      let totalVoteCount = 0;

      for (let i = 0; i < candidateIds.length; i++) {
        const candidateId = Number(candidateIds[i]);
        const voteCount = Number(voteCounts[i]);
        totalVoteCount += voteCount;

        try {
          // In a real implementation, we would fetch candidate details from contract
          candidateList.push({
            id: candidateId,
            name: `Candidate ${candidateId}`,
            description: `Description for candidate ${candidateId}`,
            voteCount,
            isActive: true,
            percentage: 0, // Will be calculated below
          });
        } catch (error) {
          console.error(`Failed to load candidate ${candidateId}:`, error);
        }
      }

      // Calculate percentages
      candidateList.forEach(candidate => {
        candidate.percentage = totalVoteCount > 0 ? (candidate.voteCount / totalVoteCount) * 100 : 0;
      });

      // Sort by vote count (descending)
      candidateList.sort((a, b) => b.voteCount - a.voteCount);

      setCandidates(candidateList);
      setTotalVotes(totalVoteCount);
      setWinner(candidateList.length > 0 ? candidateList[0] : null);
    };

    loadCandidatesWithResults();
  }, [totalCandidates, rankingData]);

  const isElectionEnded = electionStatus === ElectionStatus.Ended || electionStatus === ElectionStatus.Completed;
  const isElectionActive = electionStatus === ElectionStatus.Active;

  return (
    <div className="results-dashboard">
      <div className="results-header">
        <h2>Election Results</h2>
        <p>{electionName || 'Loading...'}</p>
      </div>

      {/* Election Overview */}
      <div className="election-overview">
        <div className="overview-card">
          <div className="overview-header">
            <BarChart3 size={24} />
            <h3>Election Overview</h3>
          </div>
          <div className="overview-stats">
            <div className="stat-item">
              <label>Status:</label>
              <span className={`status-badge status-${electionStatus}`}>
                {getElectionStatusText(electionStatus || 0)}
              </span>
            </div>
            <div className="stat-item">
              <label>Total Votes:</label>
              <span className="stat-value">{totalVotes.toLocaleString()}</span>
            </div>
            <div className="stat-item">
              <label>Total Candidates:</label>
              <span className="stat-value">{totalCandidates?.toString() || '0'}</span>
            </div>
            <div className="stat-item">
              <label>BAL Tokens Distributed:</label>
              <span className="stat-value">
                {tokenTotalSupply ? (Number(tokenTotalSupply) / 1e18).toFixed(0) : '0'} BAL
              </span>
            </div>
            {isElectionActive && endTime && (
              <div className="stat-item">
                <label>Time Remaining:</label>
                <span className="stat-value countdown">{getTimeRemaining(endTime)}</span>
              </div>
            )}
            {isElectionEnded && endTime && (
              <div className="stat-item">
                <label>Election Ended:</label>
                <span className="stat-value">{formatTimestamp(endTime)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Winner Announcement */}
        {winner && totalVotes > 0 && (
          <div className="winner-card">
            <div className="winner-header">
              <Trophy size={32} className="winner-icon" />
              <h3>{isElectionEnded ? 'Election Winner' : 'Current Leader'}</h3>
            </div>
            <div className="winner-info">
              <h4>{winner.name}</h4>
              <div className="winner-stats">
                <div className="winner-votes">
                  <Users size={20} />
                  <span>{winner.voteCount.toLocaleString()} votes ({winner.percentage.toFixed(1)}%)</span>
                </div>
                <div className="winner-margin">
                  {candidates.length > 1 && (
                    <span>
                      Leading by {(winner.voteCount - candidates[1].voteCount).toLocaleString()} votes
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Table */}
      <div className="results-section">
        <div className="section-header">
          <h3>Detailed Results</h3>
          {!isElectionEnded && (
            <p className="live-indicator">
              🔴 Live results (updates in real-time)
            </p>
          )}
        </div>

        {candidates.length === 0 ? (
          <div className="no-results">
            <BarChart3 size={48} />
            <p>No votes recorded yet</p>
          </div>
        ) : (
          <div className="results-table">
            <div className="table-header">
              <span>Rank</span>
              <span>Candidate</span>
              <span>Votes</span>
              <span>Percentage</span>
              <span>Visual</span>
            </div>
            
            {candidates.map((candidate, index) => (
              <div key={candidate.id} className="table-row">
                <div className="rank-cell">
                  <span className={`rank-number ${index === 0 ? 'winner' : ''}`}>
                    {index + 1}
                    {index === 0 && <Trophy size={16} />}
                  </span>
                </div>
                
                <div className="candidate-cell">
                  <div className="candidate-info">
                    <h4>{candidate.name}</h4>
                    <p>{candidate.description}</p>
                  </div>
                </div>
                
                <div className="votes-cell">
                  <span className="vote-count">{candidate.voteCount.toLocaleString()}</span>
                </div>
                
                <div className="percentage-cell">
                  <span className="percentage">{candidate.percentage.toFixed(1)}%</span>
                </div>
                
                <div className="visual-cell">
                  <div className="vote-bar">
                    <div 
                      className={`vote-fill ${index === 0 ? 'winner-fill' : ''}`}
                      style={{ width: `${candidate.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Election Timeline */}
      <div className="timeline-section">
        <div className="timeline-header">
          <Clock size={24} />
          <h3>Election Timeline</h3>
        </div>
        <div className="timeline">
          <div className="timeline-item">
            <div className="timeline-marker completed" />
            <div className="timeline-content">
              <h4>Election Created</h4>
              <p>Candidates added and election configured</p>
            </div>
          </div>
          
          <div className="timeline-item">
            <div className={`timeline-marker ${electionStatus !== ElectionStatus.Scheduled ? 'completed' : 'upcoming'}`} />
            <div className="timeline-content">
              <h4>Voting Started</h4>
              <p>{startTime ? formatTimestamp(startTime) : 'Loading...'}</p>
            </div>
          </div>
          
          <div className="timeline-item">
            <div className={`timeline-marker ${isElectionEnded ? 'completed' : 'upcoming'}`} />
            <div className="timeline-content">
              <h4>Voting Ends</h4>
              <p>{endTime ? formatTimestamp(endTime) : 'Loading...'}</p>
            </div>
          </div>
          
          <div className="timeline-item">
            <div className={`timeline-marker ${electionStatus === ElectionStatus.Completed ? 'completed' : 'upcoming'}`} />
            <div className="timeline-content">
              <h4>Results Finalized</h4>
              <p>{isElectionEnded ? 'Final results available' : 'Pending completion'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Participation Statistics */}
      <div className="participation-section">
        <div className="participation-header">
          <Award size={24} />
          <h3>Participation Statistics</h3>
        </div>
        <div className="participation-stats">
          <div className="participation-stat">
            <div className="stat-icon">
              <Users size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-number">{totalVotes.toLocaleString()}</span>
              <span className="stat-label">Total Votes Cast</span>
            </div>
          </div>
          
          <div className="participation-stat">
            <div className="stat-icon">
              <Award size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-number">
                {tokenTotalSupply ? (Number(tokenTotalSupply) / 1e18).toFixed(0) : '0'}
              </span>
              <span className="stat-label">BAL Tokens Distributed</span>
            </div>
          </div>
          
          <div className="participation-stat">
            <div className="stat-icon">
              <BarChart3 size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-number">{candidates.length}</span>
              <span className="stat-label">Active Candidates</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}