// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface IERC721 {
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function transferFrom(address from, address to, uint256 tokenId) external;
    function ownerOf(uint256 tokenId) external view returns (address);
    function getApproved(uint256 tokenId) external view returns (address);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
}

contract Marketplace {
    struct Listing {
        address seller;
        address tokenAddress;
        uint256 tokenId;
        uint256 price; // in wei
        bool active;
    }

    uint256 public listingCount;
    mapping(uint256 => Listing) public listings;

    event Listed(uint256 listingId, address seller, address tokenAddress, uint256 tokenId, uint256 price);
    event Cancelled(uint256 listingId);
    event Bought(uint256 listingId, address buyer);

    // Seller must approve this contract before listing
    function list(address tokenAddress, uint256 tokenId, uint256 price) external {
        require(price > 0, "price>0");
        IERC721 token = IERC721(tokenAddress);
        address owner = token.ownerOf(tokenId);
        require(owner == msg.sender, "not owner");
        // require approved or isApprovedForAll
        // (we'll trust external check; token.transferFrom will revert if not allowed)

        listings[listingCount] = Listing({
            seller: msg.sender,
            tokenAddress: tokenAddress,
            tokenId: tokenId,
            price: price,
            active: true
        });

        emit Listed(listingCount, msg.sender, tokenAddress, tokenId, price);
        listingCount++;
    }

    function cancel(uint256 listingId) external {
        Listing storage l = listings[listingId];
        require(l.active, "not active");
        require(l.seller == msg.sender, "not seller");
        l.active = false;
        emit Cancelled(listingId);
    }

    function buy(uint256 listingId) external payable {
        Listing storage l = listings[listingId];
        require(l.active, "not active");
        require(msg.value == l.price, "wrong price");

        l.active = false;

        // transfer nft
        IERC721(l.tokenAddress).safeTransferFrom(l.seller, msg.sender, l.tokenId);

        // transfer funds to seller
        (bool sent, ) = l.seller.call{value: msg.value}("");
        require(sent, "failed to send");

        emit Bought(listingId, msg.sender);
    }

    // read helpers
    function getActiveListings() external view returns (Listing[] memory) {
        uint256 total = listingCount;
        uint256 count;
        for (uint256 i = 0; i < total; i++) {
            if (listings[i].active) count++;
        }
        Listing[] memory out = new Listing[](count);
        uint256 idx;
        for (uint256 i = 0; i < total; i++) {
            if (listings[i].active) {
                out[idx] = listings[i];
                idx++;
            }
        }
        return out;
    }

    // Get active listings with their IDs
    function getActiveListingsWithIds() external view returns (uint256[] memory listingIds, Listing[] memory activeListings) {
        uint256 total = listingCount;
        uint256 count;
        for (uint256 i = 0; i < total; i++) {
            if (listings[i].active) count++;
        }
        
        listingIds = new uint256[](count);
        activeListings = new Listing[](count);
        uint256 idx;
        for (uint256 i = 0; i < total; i++) {
            if (listings[i].active) {
                listingIds[idx] = i;
                activeListings[idx] = listings[i];
                idx++;
            }
        }
        return (listingIds, activeListings);
    }
}