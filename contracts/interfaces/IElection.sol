// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IElection {
    struct Candidate {
        uint256 id;
        string name;
        string description;
        uint256 voteCount;
        bool isActive;
        uint8[3] questionnaireProfile;
    }

    struct ElectionConfig {
        string name;
        string description;
        uint256 startTime;
        uint256 endTime;
        bytes32 voterMerkleRoot;
        bool isActive;
        bool resultsPublished;
        uint256 maxCandidates;
        bool questionnaireEnabled;
    }

    // Events
    event ElectionCreated(string name, uint256 startTime, uint256 endTime);
    event CandidateAdded(uint256 indexed candidateId, string name);
    event CandidateUpdated(uint256 indexed candidateId, string name);
    event CandidateDeactivated(uint256 indexed candidateId);
    event VoteCast(address indexed voter, uint256 indexed candidateId, bool isAnonymous);
    event ElectionEnded(uint256 totalVotes);
    event ResultsPublished();
    event VoterMerkleRootUpdated(bytes32 newRoot);

    // Admin functions
    function createElection(
        string calldata name,
        string calldata description,
        uint256 startTime,
        uint256 endTime,
        bytes32 voterMerkleRoot,
        bool questionnaireEnabled
    ) external;

    function addCandidate(
        string calldata name,
        string calldata description,
        uint8[3] calldata questionnaireProfile
    ) external returns (uint256);

    function updateCandidate(
        uint256 candidateId,
        string calldata name,
        string calldata description,
        uint8[3] calldata questionnaireProfile
    ) external;

    function deactivateCandidate(uint256 candidateId) external;

    function endElection() external;

    function publishResults() external;

    function updateVoterMerkleRoot(bytes32 newRoot) external;

    // Voting functions
    function vote(
        uint256 candidateId,
        bytes32[] calldata merkleProof,
        uint8[3] calldata voterProfile
    ) external;

    function voteAnonymous(
        bytes32[] calldata merkleProof,
        uint8[3] calldata voterProfile
    ) external;

    // View functions
    function getElectionInfo() external view returns (ElectionConfig memory);

    function getCandidate(uint256 candidateId) external view returns (Candidate memory);

    function getAllCandidates() external view returns (Candidate[] memory);

    function getActiveCandidates() external view returns (Candidate[] memory);

    function getResults() external view returns (Candidate[] memory);

    function getRankedResults() external view returns (uint256[] memory, uint256[] memory);

    function isEligibleVoter(address voter, bytes32[] calldata merkleProof)
        external
        view
        returns (bool);

    function getElectionStatus() external view returns (string memory);

    // State variables getters
    function candidateCount() external view returns (uint256);

    function totalVotes() external view returns (uint256);

    function hasVoted(address voter) external view returns (bool);

    function voterToCandidate(address voter) external view returns (uint256);

    function balToken() external view returns (address);
}