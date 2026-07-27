// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title STACK — the Stack Refinery reward token
/// @notice 100M hard cap. Burned tokens still count against the cap, so total
///         emission (premint + game rewards) can never exceed 100M.
contract StackToken is ERC20, ERC20Burnable, Ownable {
    uint256 public constant MAX_SUPPLY = 100_000_000e18;
    uint256 public constant PREMINT = 5_000_000e18;

    /// @notice The game contract allowed to mint rewards. Settable once.
    address public refinery;

    uint256 public totalMinted;
    uint256 public totalBurned;

    error NotRefinery();
    error RefineryAlreadySet();
    error CapExceeded();

    constructor(address premintRecipient)
        ERC20("Stack", "STACK")
        Ownable(msg.sender)
    {
        totalMinted = PREMINT;
        _mint(premintRecipient, PREMINT);
    }

    /// @notice One-time wiring of the game contract.
    function setRefinery(address refinery_) external onlyOwner {
        if (refinery != address(0)) revert RefineryAlreadySet();
        refinery = refinery_;
    }

    /// @notice Mint game rewards. Only the refinery may call.
    function mint(address to, uint256 amount) external {
        if (msg.sender != refinery) revert NotRefinery();
        if (totalMinted + amount > MAX_SUPPLY) revert CapExceeded();
        totalMinted += amount;
        _mint(to, amount);
    }

    /// @notice How much can still be minted before hitting the cap.
    function remainingMintable() external view returns (uint256) {
        return MAX_SUPPLY - totalMinted;
    }

    function _update(address from, address to, uint256 value) internal override {
        if (to == address(0)) {
            totalBurned += value;
        }
        super._update(from, to, value);
    }
}
