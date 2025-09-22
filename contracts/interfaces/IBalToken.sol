// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IBalToken is IERC20 {
    // Events
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    event TokensMinted(address indexed to, uint256 amount, string reason);

    // Errors
    error UnauthorizedMinter();
    error MaxSupplyExceeded();
    error InvalidAmount();
    error ZeroAddress();

    // Minter management
    function addMinter(address minter) external;

    function removeMinter(address minter) external;

    // Minting functions
    function mintVoteReward(address voter) external;

    function mintTokens(
        address to,
        uint256 amount,
        string calldata reason
    ) external;

    // Burning functions
    function burn(uint256 amount) external;

    function burnFrom(address account, uint256 amount) external;

    // View functions
    function getVoteReward() external pure returns (uint256);

    function getRemainingSupply() external view returns (uint256);

    // State variables
    function VOTE_REWARD() external pure returns (uint256);

    function MAX_SUPPLY() external pure returns (uint256);

    function authorizedMinters(address minter) external view returns (bool);
}