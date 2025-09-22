// Election Contract ABI - Essential functions for the frontend
export const ElectionABI = [
  // Constructor
  {
    inputs: [
      { internalType: 'address', name: '_balTokenAddress', type: 'address' },
      { internalType: 'address', name: 'initialOwner', type: 'address' }
    ],
    stateMutability: 'nonpayable',
    type: 'constructor'
  },

  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'string', name: 'name', type: 'string' },
      { indexed: false, internalType: 'uint256', name: 'startTime', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'endTime', type: 'uint256' }
    ],
    name: 'ElectionCreated',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'voter', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'candidateId', type: 'uint256' }
    ],
    name: 'Voted',
    type: 'event'
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'uint256', name: 'candidateId', type: 'uint256' },
      { indexed: false, internalType: 'string', name: 'name', type: 'string' }
    ],
    name: 'CandidateAdded',
    type: 'event'
  },

  // Admin functions
  {
    inputs: [
      { internalType: 'string', name: '_name', type: 'string' },
      { internalType: 'string', name: '_description', type: 'string' },
      { internalType: 'uint256', name: '_startTime', type: 'uint256' },
      { internalType: 'uint256', name: '_endTime', type: 'uint256' },
      { internalType: 'bytes32', name: '_merkleRoot', type: 'bytes32' }
    ],
    name: 'createElection',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'string', name: '_name', type: 'string' },
      { internalType: 'string', name: '_description', type: 'string' },
      { internalType: 'uint8[3]', name: '_questionnaire', type: 'uint8[3]' }
    ],
    name: 'addCandidate',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'uint256', name: '_candidateId', type: 'uint256' }],
    name: 'deactivateCandidate',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },

  // Voting functions
  {
    inputs: [
      { internalType: 'uint256', name: 'candidateId', type: 'uint256' },
      { internalType: 'bytes32[]', name: 'proof', type: 'bytes32[]' }
    ],
    name: 'voteDirect',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [
      { internalType: 'uint8[3]', name: 'answers', type: 'uint8[3]' },
      { internalType: 'bytes32[]', name: 'proof', type: 'bytes32[]' }
    ],
    name: 'voteByQuiz',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },

  // View functions
  {
    inputs: [],
    name: 'getElectionStatus',
    outputs: [{ internalType: 'enum Election.ElectionStatus', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getRankedResults',
    outputs: [
      { internalType: 'uint256[]', name: 'candidateIds', type: 'uint256[]' },
      { internalType: 'uint256[]', name: 'voteCounts', type: 'uint256[]' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'getRanking',
    outputs: [
      { internalType: 'uint256[]', name: 'candidateIds', type: 'uint256[]' },
      { internalType: 'uint256[]', name: 'voteCounts', type: 'uint256[]' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'uint256', name: 'candidateId', type: 'uint256' }],
    name: 'getCandidate',
    outputs: [
      { internalType: 'string', name: 'name', type: 'string' },
      { internalType: 'string', name: 'description', type: 'string' },
      { internalType: 'uint256', name: 'voteCount', type: 'uint256' },
      { internalType: 'bool', name: 'isActive', type: 'bool' },
      { internalType: 'uint8[3]', name: 'questionnaire', type: 'uint8[3]' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ internalType: 'address', name: 'voter', type: 'address' }],
    name: 'hasVoted',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'totalCandidates',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'electionName',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'electionDescription',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'startTs',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [],
    name: 'endTs',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },

  // Errors
  {
    inputs: [],
    name: 'AlreadyVoted',
    type: 'error'
  },
  {
    inputs: [],
    name: 'CandidateNotActive',
    type: 'error'
  },
  {
    inputs: [],
    name: 'ElectionEndedError',
    type: 'error'
  },
  {
    inputs: [],
    name: 'ElectionNotStarted',
    type: 'error'
  },
  {
    inputs: [],
    name: 'InvalidMerkleProof',
    type: 'error'
  },
  {
    inputs: [],
    name: 'InvalidTimeFrame',
    type: 'error'
  }
] as const;