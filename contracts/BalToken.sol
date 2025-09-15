// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract BalToken is ERC20, Ownable, ReentrancyGuard {
    uint256 public constant VOTE_REWARD = 1 ether; // 1 BAL token
    uint256 public constant MAX_SUPPLY = 1000000 ether; // 1M BAL tokens max supply

    mapping(address => bool) public authorizedMinters;

    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    event TokensMinted(address indexed to, uint256 amount, string reason);

    error UnauthorizedMinter();
    error MaxSupplyExceeded();
    error InvalidAmount();
    error ZeroAddress();

    constructor(
        address initialOwner
    ) ERC20("BAL Election Token", "BAL") Ownable(initialOwner) {
        if (initialOwner == address(0)) revert ZeroAddress();

        // Mint initial supply to owner for testing and admin purposes
        _mint(initialOwner, 10000 ether);
        emit TokensMinted(initialOwner, 10000 ether, "Initial mint to owner");
    }

    modifier onlyAuthorizedMinter() {
        if (!authorizedMinters[msg.sender] && msg.sender != owner()) {
            revert UnauthorizedMinter();
        }
        _;
    }

    function addMinter(address minter) external onlyOwner {
        if (minter == address(0)) revert ZeroAddress();
        authorizedMinters[minter] = true;
        emit MinterAdded(minter);
    }

    function removeMinter(address minter) external onlyOwner {
        authorizedMinters[minter] = false;
        emit MinterRemoved(minter);
    }

    // Scaffolded function - mint vote reward to voter
    function mintVoteReward(address voter) external onlyAuthorizedMinter nonReentrant {
        if (voter == address(0)) revert ZeroAddress();
        if (totalSupply() + VOTE_REWARD > MAX_SUPPLY) revert MaxSupplyExceeded();

        _mint(voter, VOTE_REWARD);
        emit TokensMinted(voter, VOTE_REWARD, "Vote reward");
    }

    // General mint function for admin use
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

    function burn(uint256 amount) external {
        if (amount == 0) revert InvalidAmount();
        _burn(msg.sender, amount);
    }

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

    function getVoteReward() external pure returns (uint256) {
        return VOTE_REWARD;
    }

    function getRemainingSupply() external view returns (uint256) {
        return MAX_SUPPLY - totalSupply();
    }
}