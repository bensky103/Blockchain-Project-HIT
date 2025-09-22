import React, { useState, useEffect } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Plus, Users, Settings, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { ElectionABI, getContracts, ElectionStatus, getElectionStatusText, formatTimestamp } from '../contracts';

interface Candidate {
  id: number;
  name: string;
  description: string;
  voteCount: number;
  isActive: boolean;
  questionnaire: [number, number, number];
}

export function AdminDashboard() {
  const contracts = getContracts('localhost');
  
  // State
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [newCandidate, setNewCandidate] = useState({
    name: '',
    description: '',
    questionnaire: [5, 5, 5] as [number, number, number]
  });
  const [showAddCandidate, setShowAddCandidate] = useState(false);

  // Contract reads
  const { data: electionName } = useReadContract({
    address: contracts.election,
    abi: ElectionABI,
    functionName: 'electionName',
  });

  const { data: electionDescription } = useReadContract({
    address: contracts.election,
    abi: ElectionABI,
    functionName: 'electionDescription',
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

  // Contract writes
  const { 
    writeContract: addCandidate, 
    isPending: isAddingCandidate,
    data: addCandidateHash 
  } = useWriteContract();

  const { 
    writeContract: deactivateCandidate, 
    isPending: isDeactivating 
  } = useWriteContract();

  // Transaction receipts
  const { isLoading: isAddCandidateConfirming } = useWaitForTransactionReceipt({
    hash: addCandidateHash,
  });

  // Load candidates
  useEffect(() => {
    const loadCandidates = async () => {
      if (!totalCandidates) return;
      
      const candidateList: Candidate[] = [];
      for (let i = 1; i <= Number(totalCandidates); i++) {
        try {
          // This would need to be implemented with proper contract calls
          // For now, showing the structure
          candidateList.push({
            id: i,
            name: `Candidate ${i}`,
            description: `Description for candidate ${i}`,
            voteCount: 0,
            isActive: true,
            questionnaire: [5, 5, 5]
          });
        } catch (error) {
          console.error(`Failed to load candidate ${i}:`, error);
        }
      }
      setCandidates(candidateList);
    };

    loadCandidates();
  }, [totalCandidates]);

  const handleAddCandidate = () => {
    if (!newCandidate.name.trim() || !newCandidate.description.trim()) {
      alert('Please fill in all fields');
      return;
    }

    addCandidate({
      address: contracts.election,
      abi: ElectionABI,
      functionName: 'addCandidate',
      args: [
        newCandidate.name,
        newCandidate.description,
        newCandidate.questionnaire
      ],
    });
  };

  const handleDeactivateCandidate = (candidateId: number) => {
    if (confirm(`Are you sure you want to deactivate candidate ${candidateId}?`)) {
      deactivateCandidate({
        address: contracts.election,
        abi: ElectionABI,
        functionName: 'deactivateCandidate',
        args: [BigInt(candidateId)],
      });
    }
  };

  const canModifyElection = electionStatus === ElectionStatus.Scheduled;

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <h2>Election Administration</h2>
        <p>Manage candidates and monitor election status</p>
      </div>

      {/* Election Status Card */}
      <div className="status-card">
        <div className="status-header">
          <Clock size={24} />
          <h3>Election Status</h3>
        </div>
        <div className="status-details">
          <div className="status-item">
            <label>Election Name:</label>
            <span>{electionName || 'Loading...'}</span>
          </div>
          <div className="status-item">
            <label>Description:</label>
            <span>{electionDescription || 'Loading...'}</span>
          </div>
          <div className="status-item">
            <label>Status:</label>
            <span className={`status-badge status-${electionStatus}`}>
              {getElectionStatusText(electionStatus || 0)}
            </span>
          </div>
          <div className="status-item">
            <label>Start Time:</label>
            <span>{startTime ? formatTimestamp(startTime) : 'Loading...'}</span>
          </div>
          <div className="status-item">
            <label>End Time:</label>
            <span>{endTime ? formatTimestamp(endTime) : 'Loading...'}</span>
          </div>
          <div className="status-item">
            <label>Total Candidates:</label>
            <span>{totalCandidates?.toString() || '0'}</span>
          </div>
        </div>
      </div>

      {/* Candidates Management */}
      <div className="candidates-section">
        <div className="section-header">
          <div className="section-title">
            <Users size={24} />
            <h3>Candidates</h3>
          </div>
          
          {canModifyElection && (
            <button 
              className="add-button"
              onClick={() => setShowAddCandidate(!showAddCandidate)}
            >
              <Plus size={20} />
              Add Candidate
            </button>
          )}
        </div>

        {/* Add Candidate Form */}
        {showAddCandidate && canModifyElection && (
          <div className="add-candidate-form">
            <h4>Add New Candidate</h4>
            <div className="form-group">
              <label>Candidate Name:</label>
              <input
                type="text"
                value={newCandidate.name}
                onChange={(e) => setNewCandidate({...newCandidate, name: e.target.value})}
                placeholder="Enter candidate name"
              />
            </div>
            <div className="form-group">
              <label>Description:</label>
              <textarea
                value={newCandidate.description}
                onChange={(e) => setNewCandidate({...newCandidate, description: e.target.value})}
                placeholder="Enter candidate description"
              />
            </div>
            <div className="form-group">
              <label>Questionnaire Profile (0-10):</label>
              <div className="questionnaire-inputs">
                {newCandidate.questionnaire.map((value, index) => (
                  <div key={index} className="question-input">
                    <label>Topic {index + 1}:</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={value}
                      onChange={(e) => {
                        const newQuestionnaire = [...newCandidate.questionnaire] as [number, number, number];
                        newQuestionnaire[index] = Math.max(0, Math.min(10, parseInt(e.target.value) || 0));
                        setNewCandidate({...newCandidate, questionnaire: newQuestionnaire});
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="form-actions">
              <button 
                className="submit-button"
                onClick={handleAddCandidate}
                disabled={isAddingCandidate || isAddCandidateConfirming}
              >
                {isAddingCandidate || isAddCandidateConfirming ? 'Adding...' : 'Add Candidate'}
              </button>
              <button 
                className="cancel-button"
                onClick={() => setShowAddCandidate(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Candidates List */}
        <div className="candidates-list">
          {candidates.length === 0 ? (
            <div className="no-candidates">
              <Users size={48} />
              <p>No candidates added yet</p>
              {canModifyElection && (
                <button 
                  className="add-first-candidate"
                  onClick={() => setShowAddCandidate(true)}
                >
                  Add First Candidate
                </button>
              )}
            </div>
          ) : (
            candidates.map((candidate) => (
              <div key={candidate.id} className="candidate-card">
                <div className="candidate-header">
                  <div className="candidate-info">
                    <h4>{candidate.name}</h4>
                    <span className={`candidate-status ${candidate.isActive ? 'active' : 'inactive'}`}>
                      {candidate.isActive ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                      {candidate.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="candidate-votes">
                    <span className="vote-count">{candidate.voteCount} votes</span>
                  </div>
                </div>
                <p className="candidate-description">{candidate.description}</p>
                <div className="candidate-questionnaire">
                  <label>Questionnaire Profile:</label>
                  <div className="questionnaire-values">
                    {candidate.questionnaire.map((value, index) => (
                      <span key={index} className="questionnaire-value">
                        Topic {index + 1}: {value}
                      </span>
                    ))}
                  </div>
                </div>
                {canModifyElection && candidate.isActive && (
                  <div className="candidate-actions">
                    <button 
                      className="deactivate-button"
                      onClick={() => handleDeactivateCandidate(candidate.id)}
                      disabled={isDeactivating}
                    >
                      <Settings size={16} />
                      Deactivate
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modification Warning */}
      {!canModifyElection && (
        <div className="modification-warning">
          <AlertCircle size={20} />
          <span>
            Election modifications are disabled once voting has started or election has ended.
          </span>
        </div>
      )}
    </div>
  );
}