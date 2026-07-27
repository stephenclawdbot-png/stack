// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title Stand-in for the ponz.family STACK token
/// @notice Fixed 1B supply minted to the deployer, mirroring a launchpad
///         token. Used in tests and testnet dry-runs only — on mainnet the
///         real token address from ponz.family is passed to StackRefinery.
contract MockStack is ERC20 {
    constructor() ERC20("Stack", "STACK") {
        _mint(msg.sender, 1_000_000_000e18);
    }
}
