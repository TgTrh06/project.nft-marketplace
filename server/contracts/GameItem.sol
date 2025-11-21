// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GameItem is ERC721, Ownable {
    uint256 public nextTokenId;

    constructor() ERC721("GameItem", "GMI") Ownable(msg.sender) {}

    function mint(address to) external onlyOwner returns (uint256) {
        uint256 id = nextTokenId;
        _safeMint(to, id);
        nextTokenId++;
        return id;
    }
}