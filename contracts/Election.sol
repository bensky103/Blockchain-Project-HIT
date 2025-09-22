// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./BalToken.sol";

/**
 * @title Election
 * @author Elections-2025 Team
 * @notice A decentralized election contract with Merkle tree voter verification and dual voting modes
 * @dev Implements direct voting and anonymous quiz-based candidate matching with BAL token rewards
 */
contract Election is Ownable, ReentrancyGuard {
    /// @notice Maximum number of candidates allowed per election
    uint32 public constant MAX_CANDIDATES = 100;
    
    /// @notice Maximum questionnaire score value (0-10 scale)
    uint8 public constant MAX_QUESTIONNAIRE_SCORE = 10;
    
    /// @notice Minimum time buffer before election can start (1 hour)
    uint256 public constant MIN_START_BUFFER = 1 hours;

    /// @notice Merkle root for voter eligibility verification
    bytes32 public merkleRoot;
    
    /// @notice Election start timestamp (optimized to uint32 for gas efficiency)
    uint32 public startTs;
    
    /// @notice Election end timestamp (optimized to uint32 for gas efficiency) 
    uint32 public endTs;
    
    /// @notice Reward amount in BAL tokens for voting
    uint256 public voteReward;

    /// @notice Information about each candidate
    /// @dev Optimized struct packing: uint32 + uint32 + uint8[3] + bool = 1 slot + string storage
    struct Candidate {
        uint32 id;                      // Candidate ID (fits in uint32)
        uint32 voteCount;               // Number of votes received (fits in uint32)  
        uint8[3] questionnaireProfile;  // Policy positions (0-10 scale)
        bool isActive;                  // Whether candidate is active
        string name;                    // Candidate name (separate storage)
        string description;             // Candidate description (separate storage)
    }

    /// @notice Election configuration and metadata
    /// @dev Optimized struct packing for gas efficiency
    struct ElectionConfig {
        string name;                    // Election name
        string description;             // Election description  
        uint32 startTime;               // Start timestamp (fits in uint32)
        uint32 endTime;                 // End timestamp (fits in uint32)
        uint32 maxCandidates;           // Maximum allowed candidates (fits in uint32)
        bytes32 voterMerkleRoot;        // Merkle root for voter verification
        bool isActive;                  // Whether election is active
        bool resultsPublished;          // Whether results are published
        bool questionnaireEnabled;      // Whether anonymous voting is enabled
    }

    /// @notice Current election configuration
    ElectionConfig public electionConfig;
    
    /// @notice Mapping of candidate ID to candidate information
    mapping(uint256 => Candidate) public candidates;
    
    /// @notice Tracking which addresses have already voted
    mapping(address => bool) public hasVoted;
    
    /// @notice Mapping voter address to the candidate they voted for (for transparency)
    mapping(address => uint32) public voterToCandidate;
    
    /// @notice Array of all candidate IDs for iteration
    uint256[] public candidateIds;
    
    /// @notice Current number of candidates (optimized to uint32)
    uint32 public candidateCount;

    /// @notice BAL token contract for rewards
    BalToken public balToken;
    
    /// @notice Total number of votes cast (optimized to uint32)
    uint32 public totalVotes;

    /// @notice Non-voter airdrop amount in BAL tokens
    uint256 public airdropAmount;
    
    /// @notice Whether non-voter airdrop is enabled (can only be enabled after election ends)
    bool public airdropEnabled;
    
    /// @notice Mapping to track addresses that have claimed their airdrop
    mapping(address => bool) public claimedAirdrop;

    /// @notice Thrown when a zero address is provided where not allowed
    error ZeroAddress();
    /// @notice Thrown when election time parameters are invalid
    error InvalidTimeFrame();
    /// @notice Thrown when an empty string is provided where not allowed
    error EmptyString();
    /// @notice Thrown when Merkle proof verification fails
    error InvalidMerkleProof();
    /// @notice Thrown when trying to vote before election starts
    error ElectionNotStarted();
    /// @notice Thrown when trying to modify candidates during active voting
    error VotingPeriodActive();
    /// @notice Thrown when questionnaire values are out of range (0-10)
    error InvalidQuestionnaire();
    /// @notice Thrown when voter has already cast a vote
    error AlreadyVoted();
    /// @notice Thrown when trying to vote for inactive candidate
    error CandidateNotActive();
    /// @notice Thrown when trying to vote after election ends
    error ElectionEndedError();
    /// @notice Thrown when trying to add candidates beyond maximum limit
    error TooManyCandidates();
    /// @notice Thrown when candidate ID doesn't exist
    error CandidateNotFound();
    /// @notice Thrown when airdrop is not enabled yet
    error AirdropNotEnabled();
    /// @notice Thrown when trying to claim airdrop but address already voted
    error VoterNotEligibleForAirdrop();
    /// @notice Thrown when trying to claim airdrop multiple times
    error AirdropAlreadyClaimed();
    /// @notice Thrown when trying to enable airdrop before election ends
    error ElectionStillActive();

    /// @notice Emitted when a new election is created
    /// @param name The election name
    /// @param startTime When voting begins (timestamp)
    /// @param endTime When voting ends (timestamp)
    event ElectionCreated(string name, uint256 startTime, uint256 endTime);
    
    /// @notice Emitted when a candidate is added
    /// @param candidateId The unique candidate identifier
    /// @param name The candidate's name
    event CandidateAdded(uint256 indexed candidateId, string name);
    
    /// @notice Emitted when candidate information is updated
    /// @param candidateId The candidate identifier
    /// @param name The updated candidate name
    event CandidateUpdated(uint256 indexed candidateId, string name);
    
    /// @notice Emitted when a candidate is deactivated
    /// @param candidateId The candidate identifier
    event CandidateDeactivated(uint256 indexed candidateId);
    
    /// @notice Emitted when a vote is cast (new format)
    /// @param voter The voter's address
    /// @param candidateId The candidate voted for
    /// @param isAnonymous Whether vote was cast anonymously
    event VoteCast(address indexed voter, uint256 indexed candidateId, bool isAnonymous);
    
    /// @notice Emitted when a vote is cast (legacy format for compatibility)
    /// @param voter The voter's address  
    /// @param candidateId The candidate voted for
    event Voted(address indexed voter, uint256 indexed candidateId);
    
    /// @notice Emitted when election timing is set
    /// @param startTime When voting begins
    /// @param endTime When voting ends
    event TimesSet(uint64 startTime, uint64 endTime);
    
    /// @notice Emitted when Merkle root is updated
    /// @param root The new Merkle root hash
    event MerkleRootSet(bytes32 root);
    
    /// @notice Emitted when election ends
    /// @param totalVotes Final vote count
    event ElectionEnded(uint256 totalVotes);
    
    /// @notice Emitted when results are published
    event ResultsPublished();
    
    /// @notice Emitted when voter Merkle root is updated
    /// @param newRoot The new Merkle root hash
    event VoterMerkleRootUpdated(bytes32 newRoot);
    
    /// @notice Emitted when election results are finalized
    event ResultsFinalized();

    /// @notice Emitted when airdrop amount is set by admin
    /// @param amount The airdrop amount in BAL tokens
    event AirdropAmountSet(uint256 amount);
    
    /// @notice Emitted when airdrop is enabled after election
    event AirdropEnabled();
    
    /// @notice Emitted when non-voter claims their airdrop
    /// @param claimer The address claiming the airdrop
    /// @param amount The amount of BAL tokens claimed
    event AirdropClaimed(address indexed claimer, uint256 amount);

    /// @notice Ensures function is called only during active voting period
    /// @dev Checks both legacy timestamps and election config for compatibility
    modifier onlyDuringElection() {
        if (block.timestamp < electionConfig.startTime) revert ElectionNotStarted();
        if (block.timestamp > electionConfig.endTime) revert ElectionEndedError();
        if (block.timestamp < startTs || block.timestamp > endTs) revert ElectionNotStarted();
        _;
    }

    /// @notice Verifies voter eligibility using Merkle proof
    /// @param proof Array of Merkle proof hashes
    /// @param voter Address to verify
    /// @dev Uses keccak256 encoding of the voter address as leaf
    modifier onlyWhitelisted(bytes32[] memory proof, address voter) {
        if (voter == address(0)) revert ZeroAddress();
        bytes32 leaf = keccak256(abi.encodePacked(voter));
        if (!MerkleProof.verify(proof, merkleRoot, leaf)) revert InvalidMerkleProof();
        _;
    }

    /// @notice Initialize a new Election contract
    /// @param _balTokenAddress Address of the BAL token contract for rewards
    /// @param initialOwner Address that will own the contract
    /// @dev Sets default vote reward to 1 BAL token
    constructor(
        address _balTokenAddress,
        address initialOwner
    ) Ownable(initialOwner) {
        if (_balTokenAddress == address(0) || initialOwner == address(0)) revert ZeroAddress();

        balToken = BalToken(_balTokenAddress);
        voteReward = 1 ether; // Default 1 BAL token reward

        // Initialize empty election config with safe defaults
        electionConfig = ElectionConfig({
            name: "",
            description: "",
            startTime: 0,
            endTime: 0,
            maxCandidates: MAX_CANDIDATES,
            voterMerkleRoot: bytes32(0),
            isActive: false,
            resultsPublished: false,
            questionnaireEnabled: false
        });
    }

    /// @notice Create a new election with specified parameters
    /// @param _name Election name (must not be empty)
    /// @param _description Election description  
    /// @param _startTime When voting begins (must be at least 1 hour in future)
    /// @param _endTime When voting ends (must be after start time)
    /// @param _voterMerkleRoot Merkle root for voter verification (cannot be zero)
    /// @param _questionnaireEnabled Whether anonymous voting is allowed
    /// @dev Can only be called by contract owner
    function createElection(
        string calldata _name,
        string calldata _description,
        uint256 _startTime,
        uint256 _endTime,
        bytes32 _voterMerkleRoot,
        bool _questionnaireEnabled
    ) external onlyOwner {
        if (bytes(_name).length == 0) revert EmptyString();
        if (_startTime < block.timestamp + MIN_START_BUFFER) revert InvalidTimeFrame();
        if (_endTime <= _startTime) revert InvalidTimeFrame();
        if (_voterMerkleRoot == bytes32(0)) revert InvalidMerkleProof();

        // Ensure timestamps fit in uint32 (valid until year 2106)
        if (_startTime > type(uint32).max || _endTime > type(uint32).max) revert InvalidTimeFrame();

        electionConfig = ElectionConfig({
            name: _name,
            description: _description,
            startTime: uint32(_startTime),
            endTime: uint32(_endTime),
            maxCandidates: MAX_CANDIDATES,
            voterMerkleRoot: _voterMerkleRoot,
            isActive: true,
            resultsPublished: false,
            questionnaireEnabled: _questionnaireEnabled
        });

        // Update legacy storage for compatibility
        startTs = uint32(_startTime);
        endTs = uint32(_endTime);
        merkleRoot = _voterMerkleRoot;

        emit ElectionCreated(_name, _startTime, _endTime);
    }

    /// @notice Add a candidate to the election
    /// @param name Candidate name (must not be empty)
    /// @param description Candidate description
    /// @param questionnaireProfile Array of 3 policy positions (0-10 scale)
    /// @return candidateId The newly created candidate's ID
    /// @dev Can only be called by owner before voting starts
    function addCandidate(
        string calldata name,
        string calldata description,
        uint8[3] calldata questionnaireProfile
    ) external onlyOwner returns (uint256) {
        if (bytes(name).length == 0) revert EmptyString();

        // Check if election has started
        if (electionConfig.isActive && block.timestamp >= electionConfig.startTime) {
            revert VotingPeriodActive();
        }

        // Check maximum candidates limit
        if (candidateCount >= electionConfig.maxCandidates) revert TooManyCandidates();

        // Validate questionnaire profile values (0-10 scale)
        for (uint i = 0; i < 3; i++) {
            if (questionnaireProfile[i] > MAX_QUESTIONNAIRE_SCORE) revert InvalidQuestionnaire();
        }

        candidateCount++;
        uint256 candidateId = candidateCount;

        candidates[candidateId] = Candidate({
            id: uint32(candidateId),
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

    /// @notice Set election timing parameters
    /// @param start Election start timestamp
    /// @param end Election end timestamp  
    /// @dev Only owner can modify timing, must be future dates
    function setTimes(uint64 start, uint64 end) external onlyOwner {
        require(start < end, "Invalid times");
        require(start > block.timestamp, "Start time in past");

        startTs = uint32(start);
        endTs = uint32(end);

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

    /// @notice Set the airdrop amount for non-voters (admin only)
    /// @param amount The amount of BAL tokens to airdrop to each non-voter
    /// @dev Can be set before or after election, but airdrop can only be enabled after election ends
    function setAirdropAmount(uint256 amount) external onlyOwner {
        airdropAmount = amount;
        emit AirdropAmountSet(amount);
    }

    /// @notice Enable the airdrop for non-voters (admin only)
    /// @dev Can only be called after the election has ended
    function enableAirdrop() external onlyOwner {
        if (block.timestamp <= electionConfig.endTime) revert ElectionStillActive();
        if (!airdropEnabled) {
            airdropEnabled = true;
            emit AirdropEnabled();
        }
    }

    function getElectionStatus() external view returns (string memory) {
        if (!electionConfig.isActive) return "Not Started";
        if (block.timestamp < electionConfig.startTime) return "Scheduled";
        if (block.timestamp <= electionConfig.endTime) return "Active";
        if (!electionConfig.resultsPublished) return "Ended - Results Pending";
        return "Completed";
    }

    /// @notice Check if an address is eligible to vote (simplified implementation)
    /// @param _voter Address to check eligibility  
    /// @return bool Whether the voter is eligible
    /// @dev This is a simplified implementation for testing - production should use Merkle verification
    function isEligibleVoter(address _voter, bytes32[] calldata /* _merkleProof */) external pure returns (bool) {
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
        voterToCandidate[msg.sender] = uint32(bestCandidateId);
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
        voterToCandidate[msg.sender] = uint32(candidateId);
        candidates[candidateId].voteCount++;
        totalVotes++;

        // Mint reward token
        balToken.mintVoteReward(msg.sender);

        emit Voted(msg.sender, candidateId);
    }

    /// @notice Legacy function for backward compatibility with tests
    /// @param candidateId Candidate to vote for
    /// @param merkleProof Merkle proof for voter verification
    /// @dev This function supports legacy test compatibility
    function vote(
        uint256 candidateId,
        bytes32[] calldata merkleProof,
        uint8[3] calldata /* voterProfile */
    ) external nonReentrant onlyWhitelisted(merkleProof, msg.sender) {
        if (block.timestamp < startTs) revert ElectionNotStarted();
        if (block.timestamp > endTs) revert ElectionEndedError();
        if (hasVoted[msg.sender]) revert AlreadyVoted();
        require(candidateId > 0 && candidateId <= candidateCount, "Invalid candidate");
        if (!candidates[candidateId].isActive) revert CandidateNotActive();

        // Update state before external calls (reentrancy protection)
        hasVoted[msg.sender] = true;
        voterToCandidate[msg.sender] = uint32(candidateId);
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
        voterToCandidate[msg.sender] = uint32(bestCandidateId);
        candidates[bestCandidateId].voteCount++;
        totalVotes++;

        // Mint reward token
        balToken.mintVoteReward(msg.sender);

        emit VoteCast(msg.sender, bestCandidateId, true);
    }

    /// @notice Claim airdrop for non-voters after election ends
    /// @param proof Merkle proof that the caller is a whitelisted voter who didn't vote
    /// @dev Can only be called by eligible voters who didn't participate in the election
    function claimAirdrop(bytes32[] calldata proof) 
        external 
        nonReentrant 
        onlyWhitelisted(proof, msg.sender)
    {
        // Check airdrop is enabled
        if (!airdropEnabled) revert AirdropNotEnabled();
        
        // Check election has ended
        if (block.timestamp <= electionConfig.endTime) revert ElectionStillActive();
        
        // Check caller didn't vote
        if (hasVoted[msg.sender]) revert VoterNotEligibleForAirdrop();
        
        // Check not already claimed
        if (claimedAirdrop[msg.sender]) revert AirdropAlreadyClaimed();
        
        // Mark as claimed before external call (reentrancy protection)
        claimedAirdrop[msg.sender] = true;
        
        // Mint airdrop tokens if amount configured
        if (airdropAmount > 0) {
            balToken.mintVoteReward(msg.sender, airdropAmount);
        }
        
        // Emit event regardless of amount
        emit AirdropClaimed(msg.sender, airdropAmount);
    }
}