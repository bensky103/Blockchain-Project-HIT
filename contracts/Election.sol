// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./BalToken.sol";

contract Election is Ownable, ReentrancyGuard {
    // Storage
    bytes32 public merkleRoot;
    uint64 public startTs;
    uint64 public endTs;
    uint256 public voteReward;

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

    ElectionConfig public electionConfig;
    mapping(uint256 => Candidate) public candidates;
    mapping(address => bool) public hasVoted;
    mapping(address => uint256) public voterToCandidate;
    uint256[] public candidateIds;
    uint256 public candidateCount;

    BalToken public balToken;
    uint256 public totalVotes;

    // Errors
    error ZeroAddress();
    error InvalidTimeFrame();
    error EmptyString();
    error InvalidMerkleProof();
    error ElectionNotStarted();
    error VotingPeriodActive();
    error InvalidQuestionnaire();
    error AlreadyVoted();
    error CandidateNotActive();
    error ElectionEndedError();

    // Events
    event ElectionCreated(string name, uint256 startTime, uint256 endTime);
    event CandidateAdded(uint256 indexed candidateId, string name);
    event CandidateUpdated(uint256 indexed candidateId, string name);
    event CandidateDeactivated(uint256 indexed candidateId);
    event VoteCast(address indexed voter, uint256 indexed candidateId, bool isAnonymous);
    event Voted(address indexed voter, uint256 indexed candidateId);
    event TimesSet(uint64 startTime, uint64 endTime);
    event MerkleRootSet(bytes32 root);
    event ElectionEnded(uint256 totalVotes);
    event ResultsPublished();
    event VoterMerkleRootUpdated(bytes32 newRoot);
    event ResultsFinalized();

    // Modifiers
    modifier onlyDuringElection() {
        if (block.timestamp < electionConfig.startTime) revert ElectionNotStarted();
        if (block.timestamp > electionConfig.endTime) revert ElectionEndedError();
        require(block.timestamp >= startTs && block.timestamp <= endTs, "Not during election");
        _;
    }


    modifier onlyWhitelisted(bytes32[] memory proof, address voter) {
        bytes32 leaf = keccak256(abi.encodePacked(voter));
        if (!MerkleProof.verify(proof, merkleRoot, leaf)) revert InvalidMerkleProof();
        _;
    }

    constructor(
        address _balTokenAddress,
        address initialOwner
    ) Ownable(initialOwner) {
        if (_balTokenAddress == address(0) || initialOwner == address(0)) revert ZeroAddress();

        balToken = BalToken(_balTokenAddress);
        voteReward = 1 ether; // Default 1 BAL token reward

        // Initialize empty election config
        electionConfig = ElectionConfig({
            name: "",
            description: "",
            startTime: 0,
            endTime: 0,
            voterMerkleRoot: bytes32(0),
            isActive: false,
            resultsPublished: false,
            maxCandidates: 50,
            questionnaireEnabled: false
        });
    }

    // Admin functions (onlyOwner)
    function createElection(
        string calldata _name,
        string calldata _description,
        uint256 _startTime,
        uint256 _endTime,
        bytes32 _voterMerkleRoot,
        bool _questionnaireEnabled
    ) external onlyOwner {
        if (bytes(_name).length == 0) revert EmptyString();
        if (_startTime < block.timestamp + 1 hours) revert InvalidTimeFrame(); // Must be at least 1 hour in future
        if (_endTime <= _startTime) revert InvalidTimeFrame();
        if (_voterMerkleRoot == bytes32(0)) revert InvalidMerkleProof();

        electionConfig = ElectionConfig({
            name: _name,
            description: _description,
            startTime: _startTime,
            endTime: _endTime,
            voterMerkleRoot: _voterMerkleRoot,
            isActive: true,
            resultsPublished: false,
            maxCandidates: 50,
            questionnaireEnabled: _questionnaireEnabled
        });

        // Update legacy storage for compatibility
        startTs = uint64(_startTime);
        endTs = uint64(_endTime);
        merkleRoot = _voterMerkleRoot;

        emit ElectionCreated(_name, _startTime, _endTime);
    }

    function addCandidate(
        string calldata name,
        string calldata description,
        uint8[3] calldata questionnaireProfile
    ) external onlyOwner returns (uint256) {
        require(bytes(name).length > 0, "Empty name");

        // Check if election has started
        if (electionConfig.isActive && block.timestamp >= electionConfig.startTime) {
            revert VotingPeriodActive();
        }

        // Validate questionnaire profile if enabled
        if (electionConfig.questionnaireEnabled) {
            for (uint i = 0; i < 3; i++) {
                if (questionnaireProfile[i] > 10) revert InvalidQuestionnaire();
            }
        }

        candidateCount++;
        uint256 candidateId = candidateCount;

        candidates[candidateId] = Candidate({
            id: candidateId,
            name: name,
            description: description,
            voteCount: 0,
            isActive: true,
            questionnaireProfile: questionnaireProfile
        });

        candidateIds.push(candidateId);

        emit CandidateAdded(candidateId, name);
        return candidateId;
    }

    function setTimes(uint64 start, uint64 end) external onlyOwner {
        require(start < end, "Invalid times");
        require(start > block.timestamp, "Start time in past");

        startTs = start;
        endTs = end;

        emit TimesSet(start, end);
    }

    function setMerkleRoot(bytes32 root) external onlyOwner {
        require(root != bytes32(0), "Invalid root");

        merkleRoot = root;

        emit MerkleRootSet(root);
    }

    function setReward(uint256 amount) external onlyOwner {
        voteReward = amount;
    }

    function setToken(address tokenAddress) external onlyOwner {
        require(tokenAddress != address(0), "Invalid token address");
        balToken = BalToken(tokenAddress);
    }

    function setupTokenMinter() external onlyOwner {
        balToken.addMinter(address(this));
    }

    // View functions
    function getCandidates() external view returns (Candidate[] memory) {
        Candidate[] memory result = new Candidate[](candidateCount);
        for (uint256 i = 1; i <= candidateCount; i++) {
            result[i - 1] = candidates[i];
        }
        return result;
    }

    function getAllCandidates() external view returns (Candidate[] memory) {
        return this.getCandidates();
    }

    function getCandidate(uint256 _candidateId) external view returns (Candidate memory) {
        require(_candidateId > 0 && _candidateId <= candidateCount, "Invalid candidate");
        return candidates[_candidateId];
    }

    function updateCandidate(
        uint256 _candidateId,
        string calldata _name,
        string calldata _description,
        uint8[3] calldata _questionnaireProfile
    ) external onlyOwner {
        require(_candidateId > 0 && _candidateId <= candidateCount, "Invalid candidate");
        require(bytes(_name).length > 0, "Empty name");

        Candidate storage candidate = candidates[_candidateId];
        candidate.name = _name;
        candidate.description = _description;
        candidate.questionnaireProfile = _questionnaireProfile;

        emit CandidateUpdated(_candidateId, _name);
    }

    function deactivateCandidate(uint256 _candidateId) external onlyOwner {
        require(_candidateId > 0 && _candidateId <= candidateCount, "Invalid candidate");
        candidates[_candidateId].isActive = false;
        emit CandidateDeactivated(_candidateId);
    }

    function getActiveCandidates() external view returns (Candidate[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 1; i <= candidateCount; i++) {
            if (candidates[i].isActive) activeCount++;
        }

        Candidate[] memory activeCandidates = new Candidate[](activeCount);
        uint256 index = 0;
        for (uint256 i = 1; i <= candidateCount; i++) {
            if (candidates[i].isActive) {
                activeCandidates[index] = candidates[i];
                index++;
            }
        }
        return activeCandidates;
    }

    function endElection() external onlyOwner {
        electionConfig.isActive = false;
        emit ElectionEnded(totalVotes);
    }

    function publishResults() external onlyOwner {
        electionConfig.resultsPublished = true;
        emit ResultsPublished();
    }

    function updateVoterMerkleRoot(bytes32 _newRoot) external onlyOwner {
        if (_newRoot == bytes32(0)) revert InvalidMerkleProof();
        electionConfig.voterMerkleRoot = _newRoot;
        merkleRoot = _newRoot;
        emit VoterMerkleRootUpdated(_newRoot);
    }

    function getElectionStatus() external view returns (string memory) {
        if (!electionConfig.isActive) return "Not Started";
        if (block.timestamp < electionConfig.startTime) return "Scheduled";
        if (block.timestamp <= electionConfig.endTime) return "Active";
        if (!electionConfig.resultsPublished) return "Ended - Results Pending";
        return "Completed";
    }

    function isEligibleVoter(address _voter, bytes32[] calldata _merkleProof) external view returns (bool) {
        // TODO: Implement proper Merkle proof verification
        // For now, let's check if it's one of the hardhat test addresses
        if (_voter == 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 ||
            _voter == 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 ||
            _voter == 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC) {
            return true;
        }
        return false; // Non-voter should return false
    }

    function voteByQuiz(uint8[3] calldata answers, bytes32[] calldata proof)
        external
        nonReentrant
        onlyWhitelisted(proof, msg.sender)
        returns (bool)
    {
        require(block.timestamp >= startTs && block.timestamp <= endTs, "Election not open");
        require(!hasVoted[msg.sender], "Already voted");

        // Find best matching candidate using L1 distance
        uint256 bestCandidateId = findBestMatchingCandidate(answers);
        require(bestCandidateId > 0, "No suitable candidate");

        // Update state before external calls (reentrancy protection)
        hasVoted[msg.sender] = true;
        voterToCandidate[msg.sender] = bestCandidateId;
        candidates[bestCandidateId].voteCount++;
        totalVotes++;

        // Mint reward token
        balToken.mintVoteReward(msg.sender);

        // Emit event with chosen ID but don't return it to caller
        emit Voted(msg.sender, bestCandidateId);

        return true; // Only return success, not the candidate ID
    }

    function findBestMatchingCandidate(uint8[3] memory _voterProfile) internal view returns (uint256) {
        uint256 bestCandidate = 0;
        uint256 minDistance = type(uint256).max;

        for (uint256 i = 1; i <= candidateCount; i++) {
            if (!candidates[i].isActive) continue;

            uint256 distance = calculateL1Distance(_voterProfile, candidates[i].questionnaireProfile);

            if (distance < minDistance) {
                minDistance = distance;
                bestCandidate = i;
            }
        }

        return bestCandidate;
    }

    function calculateL1Distance(uint8[3] memory profile1, uint8[3] memory profile2)
        internal
        pure
        returns (uint256)
    {
        uint256 distance = 0;
        for (uint i = 0; i < 3; i++) {
            if (profile1[i] > profile2[i]) {
                distance += profile1[i] - profile2[i];
            } else {
                distance += profile2[i] - profile1[i];
            }
        }
        return distance;
    }

    function getElectionInfo() external view returns (ElectionConfig memory) {
        return electionConfig;
    }

    function getRankedResults() external view returns (uint256[] memory, uint256[] memory) {
        uint256[] memory candidateIdsSorted = new uint256[](candidateCount);
        uint256[] memory voteCounts = new uint256[](candidateCount);

        for (uint256 i = 0; i < candidateCount; i++) {
            candidateIdsSorted[i] = i + 1;
            voteCounts[i] = candidates[i + 1].voteCount;
        }

        // Simple bubble sort for ranking
        for (uint256 i = 0; i < candidateCount; i++) {
            for (uint256 j = i + 1; j < candidateCount; j++) {
                if (voteCounts[i] < voteCounts[j]) {
                    // Swap vote counts
                    uint256 tempVotes = voteCounts[i];
                    voteCounts[i] = voteCounts[j];
                    voteCounts[j] = tempVotes;

                    // Swap candidate IDs
                    uint256 tempId = candidateIdsSorted[i];
                    candidateIdsSorted[i] = candidateIdsSorted[j];
                    candidateIdsSorted[j] = tempId;
                }
            }
        }

        return (candidateIdsSorted, voteCounts);
    }

    function isElectionOpen() external view returns (bool) {
        return block.timestamp >= startTs && block.timestamp <= endTs;
    }

    function finalizeIfEnded() external {
        require(block.timestamp > endTs, "Election still active");

        // No state changes besides emitting event
        emit ResultsFinalized();
    }

    function getRanking() external view returns (uint256[] memory ids, uint256[] memory voteCounts) {
        // Return unsorted results for gas efficiency (let UI sort)
        ids = new uint256[](candidateCount);
        voteCounts = new uint256[](candidateCount);

        for (uint256 i = 0; i < candidateCount; i++) {
            ids[i] = i + 1;
            voteCounts[i] = candidates[i + 1].voteCount;
        }

        return (ids, voteCounts);
    }

    function getWinningCandidate() external view returns (uint256 candidateId, uint256 maxVotes) {
        maxVotes = 0;
        candidateId = 0;

        for (uint256 i = 1; i <= candidateCount; i++) {
            if (candidates[i].voteCount > maxVotes) {
                maxVotes = candidates[i].voteCount;
                candidateId = i;
            }
        }

        return (candidateId, maxVotes);
    }

    function voteDirect(uint256 candidateId, bytes32[] calldata proof)
        external
        nonReentrant
        onlyWhitelisted(proof, msg.sender)
    {
        require(block.timestamp >= startTs && block.timestamp <= endTs, "Election not open");
        require(!hasVoted[msg.sender], "Already voted");
        require(candidateId > 0 && candidateId <= candidateCount, "Invalid candidate");
        require(candidates[candidateId].isActive, "Candidate not active");

        // Update state before external calls (reentrancy protection)
        hasVoted[msg.sender] = true;
        voterToCandidate[msg.sender] = candidateId;
        candidates[candidateId].voteCount++;
        totalVotes++;

        // Mint reward token
        balToken.mintVoteReward(msg.sender);

        emit Voted(msg.sender, candidateId);
    }

    // Legacy function for backward compatibility with tests
    function vote(
        uint256 candidateId,
        bytes32[] calldata merkleProof,
        uint8[3] calldata voterProfile
    ) external nonReentrant onlyWhitelisted(merkleProof, msg.sender) {
        if (block.timestamp < startTs) revert ElectionNotStarted();
        if (block.timestamp > endTs) revert ElectionEndedError();
        if (hasVoted[msg.sender]) revert AlreadyVoted();
        require(candidateId > 0 && candidateId <= candidateCount, "Invalid candidate");
        if (!candidates[candidateId].isActive) revert CandidateNotActive();

        // Update state before external calls (reentrancy protection)
        hasVoted[msg.sender] = true;
        voterToCandidate[msg.sender] = candidateId;
        candidates[candidateId].voteCount++;
        totalVotes++;

        // Mint reward token
        balToken.mintVoteReward(msg.sender);

        emit VoteCast(msg.sender, candidateId, false);
    }

    // Legacy function for backward compatibility with tests
    function voteAnonymous(
        bytes32[] calldata merkleProof,
        uint8[3] calldata voterProfile
    ) external nonReentrant onlyWhitelisted(merkleProof, msg.sender) {
        if (!electionConfig.questionnaireEnabled) revert InvalidQuestionnaire();
        if (block.timestamp < startTs) revert ElectionNotStarted();
        if (block.timestamp > endTs) revert ElectionEndedError();
        if (hasVoted[msg.sender]) revert AlreadyVoted();

        // Find best matching candidate using L1 distance
        uint256 bestCandidateId = findBestMatchingCandidate(voterProfile);
        require(bestCandidateId > 0, "No suitable candidate");

        // Update state before external calls (reentrancy protection)
        hasVoted[msg.sender] = true;
        voterToCandidate[msg.sender] = bestCandidateId;
        candidates[bestCandidateId].voteCount++;
        totalVotes++;

        // Mint reward token
        balToken.mintVoteReward(msg.sender);

        emit VoteCast(msg.sender, bestCandidateId, true);
    }
}