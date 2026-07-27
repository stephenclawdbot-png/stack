// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title Stack Refinery miner rigs (T1–T4)
/// @notice Each token stores its tier; hashrate is derived from the tier.
///         T0 (Hand Drill) is not an NFT — it lives inside StackRefinery.
contract MinerNFT is ERC721Enumerable, Ownable {
    /// @notice The game contract allowed to mint. Settable once.
    address public refinery;

    uint256 public nextTokenId = 1;
    mapping(uint256 => uint8) private _tier;

    // hashrate per tier, index 0 unused (T0 is not an NFT)
    uint256[5] public TIER_HASHRATE = [0, 5, 25, 100, 500];

    error NotRefinery();
    error RefineryAlreadySet();
    error InvalidTier();

    constructor() ERC721("Stack Miner", "STACKRIG") Ownable(msg.sender) {}

    function setRefinery(address refinery_) external onlyOwner {
        if (refinery != address(0)) revert RefineryAlreadySet();
        refinery = refinery_;
    }

    function mint(address to, uint8 tier) external returns (uint256 tokenId) {
        if (msg.sender != refinery) revert NotRefinery();
        if (tier < 1 || tier > 4) revert InvalidTier();
        tokenId = nextTokenId++;
        _tier[tokenId] = tier;
        _safeMint(to, tokenId);
    }

    function minerTier(uint256 tokenId) external view returns (uint8) {
        _requireOwned(tokenId);
        return _tier[tokenId];
    }

    function minerHashrate(uint256 tokenId) external view returns (uint256) {
        _requireOwned(tokenId);
        return TIER_HASHRATE[_tier[tokenId]];
    }
}
