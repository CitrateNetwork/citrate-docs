// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PatentNFT.sol";
import "./PatentTiers.sol";
import "./KYCRegistry.sol";

/**
 * @title PatentMarketplace
 * @notice Buy, sell, and auction patent NFTs. Supports fixed-price listings
 *         and open bidding. Revenue is routed through the tier system for
 *         revenue splits. ERC-2981-style royalties on secondary sales.
 */
contract PatentMarketplace is ReentrancyGuard {
    // -----------------------------------------------------------------------
    //  Types
    // -----------------------------------------------------------------------

    struct Listing {
        uint256 patentId;
        address seller;
        uint256 askPrice;
        uint256 royaltyBps;       // Royalty to original inventor on secondary sales
        bool active;
        uint256 createdAt;
    }

    struct Bid {
        uint256 patentId;
        address bidder;
        uint256 amount;
        bool active;
        uint256 createdAt;
    }

    // -----------------------------------------------------------------------
    //  State
    // -----------------------------------------------------------------------

    PatentNFT public immutable patentNFT;
    PatentTiers public immutable patentTiers;
    KYCRegistry public immutable kycRegistry;

    uint256 private _nextListingId = 1;
    uint256 private _nextBidId = 1;

    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Bid) public bids;

    /// @notice patentId => active listing ID (0 if none)
    mapping(uint256 => uint256) public activeListings;

    /// @notice patentId => bid IDs
    mapping(uint256 => uint256[]) public patentBids;

    // -----------------------------------------------------------------------
    //  Events
    // -----------------------------------------------------------------------

    event PatentListed(uint256 indexed listingId, uint256 indexed patentId, address indexed seller, uint256 askPrice);
    event ListingCancelled(uint256 indexed listingId, uint256 indexed patentId);
    event BidPlaced(uint256 indexed bidId, uint256 indexed patentId, address indexed bidder, uint256 amount);
    event BidAccepted(uint256 indexed bidId, uint256 indexed patentId, address buyer, address seller, uint256 amount);
    event BidCancelled(uint256 indexed bidId);
    event PatentBought(uint256 indexed patentId, address buyer, address seller, uint256 price);

    // -----------------------------------------------------------------------
    //  Constructor
    // -----------------------------------------------------------------------

    constructor(address _patentNFT, address _patentTiers, address _kycRegistry) {
        patentNFT = PatentNFT(_patentNFT);
        patentTiers = PatentTiers(_patentTiers);
        kycRegistry = KYCRegistry(_kycRegistry);
    }

    // -----------------------------------------------------------------------
    //  Listings
    // -----------------------------------------------------------------------

    function listPatent(
        uint256 patentId,
        uint256 askPrice,
        uint256 royaltyBps
    ) external returns (uint256 listingId) {
        require(patentNFT.ownerOf(patentId) == msg.sender, "Market: not owner");
        require(askPrice > 0, "Market: zero price");
        require(royaltyBps <= 2500, "Market: royalty too high"); // max 25%
        require(activeListings[patentId] == 0, "Market: already listed");

        listingId = _nextListingId++;
        listings[listingId] = Listing({
            patentId: patentId,
            seller: msg.sender,
            askPrice: askPrice,
            royaltyBps: royaltyBps,
            active: true,
            createdAt: block.timestamp
        });
        activeListings[patentId] = listingId;

        emit PatentListed(listingId, patentId, msg.sender, askPrice);
    }

    function cancelListing(uint256 listingId) external {
        Listing storage l = listings[listingId];
        require(l.active, "Market: not active");
        require(l.seller == msg.sender, "Market: not seller");
        l.active = false;
        activeListings[l.patentId] = 0;
        emit ListingCancelled(listingId, l.patentId);
    }

    /**
     * @notice Buy a patent at the listed ask price.
     */
    function buyPatent(uint256 listingId) external payable nonReentrant {
        Listing storage l = listings[listingId];
        require(l.active, "Market: not active");
        require(msg.value >= l.askPrice, "Market: insufficient payment");
        require(
            kycRegistry.isVerified(msg.sender, KYCRegistry.VerificationLevel.INDIVIDUAL),
            "Market: buyer KYC required"
        );

        l.active = false;
        activeListings[l.patentId] = 0;

        _executeSale(l.patentId, l.seller, msg.sender, l.askPrice, l.royaltyBps);

        // Refund excess
        if (msg.value > l.askPrice) {
            (bool ok, ) = msg.sender.call{value: msg.value - l.askPrice}("");
            require(ok, "Market: refund failed");
        }

        emit PatentBought(l.patentId, msg.sender, l.seller, l.askPrice);
    }

    // -----------------------------------------------------------------------
    //  Bidding
    // -----------------------------------------------------------------------

    function placeBid(uint256 patentId) external payable returns (uint256 bidId) {
        require(msg.value > 0, "Market: zero bid");
        require(
            kycRegistry.isVerified(msg.sender, KYCRegistry.VerificationLevel.INDIVIDUAL),
            "Market: bidder KYC required"
        );

        bidId = _nextBidId++;
        bids[bidId] = Bid({
            patentId: patentId,
            bidder: msg.sender,
            amount: msg.value,
            active: true,
            createdAt: block.timestamp
        });
        patentBids[patentId].push(bidId);

        emit BidPlaced(bidId, patentId, msg.sender, msg.value);
    }

    function cancelBid(uint256 bidId) external nonReentrant {
        Bid storage b = bids[bidId];
        require(b.active, "Market: bid not active");
        require(b.bidder == msg.sender, "Market: not bidder");
        b.active = false;

        (bool ok, ) = msg.sender.call{value: b.amount}("");
        require(ok, "Market: refund failed");

        emit BidCancelled(bidId);
    }

    function acceptBid(uint256 bidId) external nonReentrant {
        Bid storage b = bids[bidId];
        require(b.active, "Market: bid not active");
        require(patentNFT.ownerOf(b.patentId) == msg.sender, "Market: not owner");

        b.active = false;

        // Cancel any active listing
        uint256 listingId = activeListings[b.patentId];
        if (listingId > 0) {
            listings[listingId].active = false;
            activeListings[b.patentId] = 0;
        }

        // Use listing royalty if exists, otherwise default 5%
        uint256 royaltyBps = listingId > 0 ? listings[listingId].royaltyBps : 500;

        _executeSale(b.patentId, msg.sender, b.bidder, b.amount, royaltyBps);

        emit BidAccepted(bidId, b.patentId, b.bidder, msg.sender, b.amount);
    }

    // -----------------------------------------------------------------------
    //  Views
    // -----------------------------------------------------------------------

    function getListing(uint256 listingId) external view returns (Listing memory) {
        return listings[listingId];
    }

    function getBid(uint256 bidId) external view returns (Bid memory) {
        return bids[bidId];
    }

    function getBidsForPatent(uint256 patentId) external view returns (uint256[] memory) {
        return patentBids[patentId];
    }

    // -----------------------------------------------------------------------
    //  Internal
    // -----------------------------------------------------------------------

    function _executeSale(
        uint256 patentId,
        address seller,
        address buyer,
        uint256 price,
        uint256 royaltyBps
    ) internal {
        // Get original inventor for royalties on secondary sales
        PatentNFT.PatentInfo memory info = patentNFT.getPatentInfo(patentId);
        bool isSecondarySale = seller != info.inventor;

        uint256 royalty = 0;
        if (isSecondarySale && royaltyBps > 0) {
            royalty = (price * royaltyBps) / 10000;
            (bool ok, ) = info.inventor.call{value: royalty}("");
            require(ok, "Market: royalty transfer failed");
        }

        uint256 remaining = price - royalty;

        // Route through tier system
        uint256 ownerAmount = patentTiers.distributeRevenue{value: remaining}(patentId, remaining);

        // Send seller's portion
        if (ownerAmount > 0) {
            (bool ok, ) = seller.call{value: ownerAmount}("");
            require(ok, "Market: seller transfer failed");
        }

        // Transfer the NFT
        patentNFT.transferFrom(seller, buyer, patentId);
    }
}
