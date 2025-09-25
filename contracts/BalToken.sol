// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title BalToken
 * @author Elections-2025 Team
 * @notice BAL token contract for election rewards with controlled minting
 * @dev ERC20 token with authorized minter system for election contracts
 */
contract BalToken is ERC20, Ownable, ReentrancyGuard {
    /// @notice Standard vote reward amount (1 BAL token)
    uint256 public constant VOTE_REWARD = 1 ether;
    
    /// @notice Maximum total supply to prevent inflation (1M BAL tokens)
    uint256 public constant MAX_SUPPLY = 1000000 ether;

    /// @notice Mapping of addresses authorized to mint tokens
    mapping(address => bool) public authorizedMinters;

    /// @notice Emitted when a minter is added
    /// @param minter Address granted minting permission
    event MinterAdded(address indexed minter);
    
    /// @notice Emitted when a minter is removed
    /// @param minter Address with minting permission revoked
    event MinterRemoved(address indexed minter);
    
    /// @notice Emitted when tokens are minted
    /// @param to Recipient address
    /// @param amount Number of tokens minted
    /// @param reason Description of why tokens were minted
    event TokensMinted(address indexed to, uint256 amount, string reason);

    /// @notice Thrown when caller lacks minting authorization
    error UnauthorizedMinter();
    /// @notice Thrown when minting would exceed maximum supply
    error MaxSupplyExceeded();
    /// @notice Thrown when zero amount is provided
    error InvalidAmount();
    /// @notice Thrown when zero address is provided
    error ZeroAddress();

    /// @notice Restricts function access to authorized minters and owner
    /// @dev Owner always has minting permission
    modifier onlyAuthorizedMinter() {
        if (!authorizedMinters[msg.sender] && msg.sender != owner()) {
            revert UnauthorizedMinter();
        }
        _;
    }

    /// @notice Initialize BAL token contract
    /// @param initialOwner Address that will own the contract
    /// @dev Mints 10,000 BAL tokens to owner for testing/admin purposes
    constructor(
        address initialOwner
    ) ERC20("BAL Election Token", "BAL") Ownable(initialOwner) {
        if (initialOwner == address(0)) revert ZeroAddress();

        // Mint initial supply to owner for testing and admin purposes
        _mint(initialOwner, 10000 ether);
        emit TokensMinted(initialOwner, 10000 ether, "Initial mint to owner");
    }

    /// @notice Authorize an address to mint tokens
    /// @param minter Address to grant minting permission
    /// @dev Only owner can add minters
    function addMinter(address minter) external onlyOwner {
        if (minter == address(0)) revert ZeroAddress();
        authorizedMinters[minter] = true;
        emit MinterAdded(minter);
    }

    /// @notice Revoke minting authorization from an address
    /// @param minter Address to revoke minting permission
    /// @dev Only owner can remove minters
    function removeMinter(address minter) external onlyOwner {
        authorizedMinters[minter] = false;
        emit MinterRemoved(minter);
    }

    /// @notice Mint reward tokens to voter (called by election contracts)
    /// @param voter Address to receive vote reward
    /// @dev Can only be called by authorized minters, includes supply check
    function mintVoteReward(address voter) external onlyAuthorizedMinter nonReentrant {
        if (voter == address(0)) revert ZeroAddress();
        if (totalSupply() + VOTE_REWARD > MAX_SUPPLY) revert MaxSupplyExceeded();

        _mint(voter, VOTE_REWARD);
        emit TokensMinted(voter, VOTE_REWARD, "Vote reward");
    }

    /// @notice Mint custom reward tokens to voter (called by election contracts for airdrops)
    /// @param voter Address to receive reward
    /// @param amount Custom reward amount
    /// @dev Can only be called by authorized minters, includes supply check
    function mintVoteReward(address voter, uint256 amount) external onlyAuthorizedMinter nonReentrant {
        if (voter == address(0)) revert ZeroAddress();
        if (amount == 0) revert InvalidAmount();
        if (totalSupply() + amount > MAX_SUPPLY) revert MaxSupplyExceeded();

        _mint(voter, amount);
        emit TokensMinted(voter, amount, "Airdrop reward");
    }

    /// @notice Mint arbitrary amount of tokens (admin function)
    /// @param to Recipient address
    /// @param amount Number of tokens to mint
    /// @param reason Description of why tokens are being minted
    /// @dev Only owner can call this function
    function mintTokens(
        address to,
        uint256 amount,
        string calldata reason
    ) external onlyOwner nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert InvalidAmount();
        if (totalSupply() + amount > MAX_SUPPLY) revert MaxSupplyExceeded();

        _mint(to, amount);
        emit TokensMinted(to, amount, reason);
    }

    /// @notice Burn tokens from caller's balance
    /// @param amount Number of tokens to burn
    function burn(uint256 amount) external {
        if (amount == 0) revert InvalidAmount();
        _burn(msg.sender, amount);
    }

    /// @notice Burn tokens from another address (requires allowance)
    /// @param account Address to burn tokens from
    /// @param amount Number of tokens to burn
    /// @dev Requires sufficient allowance
    function burnFrom(address account, uint256 amount) external {
        if (account == address(0)) revert ZeroAddress();
        if (amount == 0) revert InvalidAmount();

        uint256 currentAllowance = allowance(account, msg.sender);
        if (currentAllowance < amount) {
            revert ERC20InsufficientAllowance(msg.sender, currentAllowance, amount);
        }

        _spendAllowance(account, msg.sender, amount);
        _burn(account, amount);
    }

    /// @notice Get the standard vote reward amount
    /// @return The vote reward amount (1 BAL token)
    function getVoteReward() external pure returns (uint256) {
        return VOTE_REWARD;
    }

    /// @notice Get remaining tokens that can be minted
    /// @return Number of tokens remaining until max supply
    function getRemainingSupply() external view returns (uint256) {
        return MAX_SUPPLY - totalSupply();
    }
}