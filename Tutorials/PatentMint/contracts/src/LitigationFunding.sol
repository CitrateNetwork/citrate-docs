// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PatentNFT.sol";
import "./PatentTiers.sol";
import "./KYCRegistry.sol";

/**
 * @title LitigationFunding
 * @notice IP Defense Marketplace with three backing modes:
 *
 *         1. DONATE    — Pure donation, no return expected. Funds go directly
 *                        to the patent owner for legal costs.
 *         2. BUY_STAKE — Buy fractional IP revenue rights at the owner's set
 *                        price per basis point. Fixed-price purchase.
 *         3. OFFER     — Propose a SALT amount for a desired % of IP revenue.
 *                        Patent owner can accept or reject each offer.
 *
 *         Platform NEVER funds litigation. All legal engagement is between
 *         inventor and counsel. This contract only facilitates the marketplace
 *         and enforces on-chain revenue splits.
 */
contract LitigationFunding is ReentrancyGuard {
    // -----------------------------------------------------------------------
    //  Types
    // -----------------------------------------------------------------------

    enum BackingType { DONATE, BUY_STAKE, OFFER }
    enum OfferStatus { PENDING, ACCEPTED, REJECTED, WITHDRAWN }

    struct DefensePost {
        uint256 patentId;
        address patentOwner;
        string descriptionCID;       // IPFS: case details, evidence summary
        uint256 stakeOfferedBps;     // Total % of future revenue available for sale
        uint256 stakeSoldBps;        // % already sold to buyers
        uint256 pricePerBps;         // Owner's asking price per basis point (for BUY_STAKE)
        uint256 fundingGoal;         // SALT needed (soft goal — post stays active after)
        uint256 fundingRaised;       // Total SALT received (donations + purchases + accepted offers)
        uint256 deadline;
        bool active;
    }

    struct Backing {
        address backer;
        uint256 amount;              // SALT contributed
        uint256 stakeBps;            // Revenue share received (0 for donations)
        BackingType backingType;
    }

    struct Offer {
        uint256 postId;
        address offerer;
        uint256 amount;              // SALT offered
        uint256 requestedBps;        // % of IP revenue requested
        OfferStatus status;
        uint256 createdAt;
    }

    // -----------------------------------------------------------------------
    //  State
    // -----------------------------------------------------------------------

    PatentNFT public immutable patentNFT;
    PatentTiers public immutable patentTiers;
    KYCRegistry public immutable kycRegistry;

    uint256 private _nextPostId = 1;
    uint256 private _nextOfferId = 1;

    mapping(uint256 => DefensePost) public posts;
    mapping(uint256 => Backing[]) public postBackings;
    mapping(uint256 => Offer) public offers;
    mapping(uint256 => uint256[]) public postOfferIds;

    /// @notice patentId => active post ID (0 if none)
    mapping(uint256 => uint256) public activePost;

    // -----------------------------------------------------------------------
    //  Events
    // -----------------------------------------------------------------------

    event DefensePostCreated(
        uint256 indexed postId,
        uint256 indexed patentId,
        uint256 stakeOfferedBps,
        uint256 pricePerBps,
        uint256 fundingGoal,
        uint256 deadline
    );
    event Donated(uint256 indexed postId, address indexed donor, uint256 amount);
    event StakePurchased(uint256 indexed postId, address indexed buyer, uint256 amount, uint256 stakeBps);
    event OfferCreated(uint256 indexed offerId, uint256 indexed postId, address indexed offerer, uint256 amount, uint256 requestedBps);
    event OfferAccepted(uint256 indexed offerId, uint256 indexed postId, address indexed offerer, uint256 amount, uint256 stakeBps);
    event OfferRejected(uint256 indexed offerId);
    event OfferWithdrawn(uint256 indexed offerId);
    event FundsRefunded(uint256 indexed postId, address indexed backer, uint256 amount);
    event PostCancelled(uint256 indexed postId);

    // -----------------------------------------------------------------------
    //  Constructor
    // -----------------------------------------------------------------------

    constructor(address _patentNFT, address _patentTiers, address _kycRegistry) {
        patentNFT = PatentNFT(_patentNFT);
        patentTiers = PatentTiers(_patentTiers);
        kycRegistry = KYCRegistry(_kycRegistry);
    }

    // -----------------------------------------------------------------------
    //  Defense posts
    // -----------------------------------------------------------------------

    /**
     * @notice Create a defense post. Only DEFENDED tier patents can use this.
     * @param pricePerBps  Owner's asking price per basis point of revenue share (for BUY_STAKE mode).
     */
    function createDefensePost(
        uint256 patentId,
        string calldata descriptionCID,
        uint256 stakeOfferedBps,
        uint256 pricePerBps,
        uint256 fundingGoal,
        uint256 duration
    ) external returns (uint256 postId) {
        require(patentNFT.ownerOf(patentId) == msg.sender, "Defense: not owner");
        require(activePost[patentId] == 0, "Defense: post already active");

        PatentTiers.PatentTierInfo memory tierInfo = patentTiers.getTier(patentId);
        require(tierInfo.tier == PatentTiers.ProtectionTier.DEFENDED, "Defense: DEFENDED tier required");

        require(stakeOfferedBps > 0 && stakeOfferedBps <= 5000, "Defense: stake 1-50%");
        require(fundingGoal > 0, "Defense: zero goal");
        require(duration >= 1 days && duration <= 90 days, "Defense: duration 1-90 days");

        postId = _nextPostId++;
        posts[postId] = DefensePost({
            patentId: patentId,
            patentOwner: msg.sender,
            descriptionCID: descriptionCID,
            stakeOfferedBps: stakeOfferedBps,
            stakeSoldBps: 0,
            pricePerBps: pricePerBps,
            fundingGoal: fundingGoal,
            fundingRaised: 0,
            deadline: block.timestamp + duration,
            active: true
        });
        activePost[patentId] = postId;

        emit DefensePostCreated(postId, patentId, stakeOfferedBps, pricePerBps, fundingGoal, block.timestamp + duration);
    }

    // -----------------------------------------------------------------------
    //  Mode 1: DONATE — Pure donation, no return
    // -----------------------------------------------------------------------

    /**
     * @notice Donate SALT to a patent defense. No revenue share in return.
     *         Funds go directly to the patent owner.
     */
    function donate(uint256 postId) external payable nonReentrant {
        DefensePost storage post = posts[postId];
        _requireActiveBacker(post);

        post.fundingRaised += msg.value;

        postBackings[postId].push(Backing({
            backer: msg.sender,
            amount: msg.value,
            stakeBps: 0,
            backingType: BackingType.DONATE
        }));

        // Donations transfer immediately to patent owner
        (bool ok, ) = post.patentOwner.call{value: msg.value}("");
        require(ok, "Defense: transfer failed");

        emit Donated(postId, msg.sender, msg.value);
    }

    // -----------------------------------------------------------------------
    //  Mode 2: BUY_STAKE — Buy % IP at owner's price
    // -----------------------------------------------------------------------

    /**
     * @notice Buy fractional IP revenue rights at the owner's set price.
     * @param bpsAmount  Number of basis points to purchase.
     */
    function buyStake(uint256 postId, uint256 bpsAmount) external payable nonReentrant {
        DefensePost storage post = posts[postId];
        _requireActiveBacker(post);

        require(bpsAmount > 0, "Defense: zero bps");
        require(post.stakeSoldBps + bpsAmount <= post.stakeOfferedBps, "Defense: exceeds available stake");

        uint256 cost = bpsAmount * post.pricePerBps;
        require(msg.value >= cost, "Defense: insufficient payment");

        post.stakeSoldBps += bpsAmount;
        post.fundingRaised += cost;

        postBackings[postId].push(Backing({
            backer: msg.sender,
            amount: cost,
            stakeBps: bpsAmount,
            backingType: BackingType.BUY_STAKE
        }));

        // Transfer payment to patent owner
        (bool ok, ) = post.patentOwner.call{value: cost}("");
        require(ok, "Defense: transfer failed");

        // Refund overpayment
        if (msg.value > cost) {
            (bool ok2, ) = msg.sender.call{value: msg.value - cost}("");
            require(ok2, "Defense: refund failed");
        }

        emit StakePurchased(postId, msg.sender, cost, bpsAmount);
    }

    // -----------------------------------------------------------------------
    //  Mode 3: OFFER — Propose SALT for % IP (owner accepts/rejects)
    // -----------------------------------------------------------------------

    /**
     * @notice Make an offer: propose SALT for a desired % of IP revenue.
     *         SALT is held in escrow until the owner accepts/rejects or the
     *         offerer withdraws.
     */
    function makeOffer(uint256 postId, uint256 requestedBps) external payable nonReentrant returns (uint256 offerId) {
        DefensePost storage post = posts[postId];
        _requireActiveBacker(post);

        require(requestedBps > 0, "Defense: zero bps");
        require(requestedBps <= post.stakeOfferedBps - post.stakeSoldBps, "Defense: exceeds available stake");
        require(msg.value > 0, "Defense: zero offer");

        offerId = _nextOfferId++;
        offers[offerId] = Offer({
            postId: postId,
            offerer: msg.sender,
            amount: msg.value,
            requestedBps: requestedBps,
            status: OfferStatus.PENDING,
            createdAt: block.timestamp
        });
        postOfferIds[postId].push(offerId);

        emit OfferCreated(offerId, postId, msg.sender, msg.value, requestedBps);
    }

    /**
     * @notice Patent owner accepts an offer. SALT transfers to owner,
     *         offerer gets revenue share rights.
     */
    function acceptOffer(uint256 offerId) external nonReentrant {
        Offer storage offer = offers[offerId];
        require(offer.status == OfferStatus.PENDING, "Defense: offer not pending");

        DefensePost storage post = posts[offer.postId];
        require(post.patentOwner == msg.sender, "Defense: not owner");
        require(post.active, "Defense: not active");
        require(post.stakeSoldBps + offer.requestedBps <= post.stakeOfferedBps, "Defense: exceeds available");

        offer.status = OfferStatus.ACCEPTED;
        post.stakeSoldBps += offer.requestedBps;
        post.fundingRaised += offer.amount;

        postBackings[offer.postId].push(Backing({
            backer: offer.offerer,
            amount: offer.amount,
            stakeBps: offer.requestedBps,
            backingType: BackingType.OFFER
        }));

        // Transfer escrowed SALT to patent owner
        (bool ok, ) = post.patentOwner.call{value: offer.amount}("");
        require(ok, "Defense: transfer failed");

        emit OfferAccepted(offerId, offer.postId, offer.offerer, offer.amount, offer.requestedBps);
    }

    /**
     * @notice Patent owner rejects an offer. SALT returns to offerer.
     */
    function rejectOffer(uint256 offerId) external nonReentrant {
        Offer storage offer = offers[offerId];
        require(offer.status == OfferStatus.PENDING, "Defense: offer not pending");

        DefensePost storage post = posts[offer.postId];
        require(post.patentOwner == msg.sender, "Defense: not owner");

        offer.status = OfferStatus.REJECTED;

        (bool ok, ) = offer.offerer.call{value: offer.amount}("");
        require(ok, "Defense: refund failed");

        emit OfferRejected(offerId);
    }

    /**
     * @notice Offerer withdraws their pending offer. SALT returned.
     */
    function withdrawOffer(uint256 offerId) external nonReentrant {
        Offer storage offer = offers[offerId];
        require(offer.offerer == msg.sender, "Defense: not offerer");
        require(offer.status == OfferStatus.PENDING, "Defense: offer not pending");

        offer.status = OfferStatus.WITHDRAWN;

        (bool ok, ) = msg.sender.call{value: offer.amount}("");
        require(ok, "Defense: refund failed");

        emit OfferWithdrawn(offerId);
    }

    // -----------------------------------------------------------------------
    //  Post management
    // -----------------------------------------------------------------------

    /**
     * @notice Patent owner cancels their defense post.
     *         All pending offers are auto-refundable via withdrawOffer.
     */
    function cancelPost(uint256 postId) external {
        DefensePost storage post = posts[postId];
        require(post.patentOwner == msg.sender, "Defense: not owner");
        require(post.active, "Defense: not active");

        post.active = false;
        activePost[post.patentId] = 0;

        emit PostCancelled(postId);
    }

    /**
     * @notice Refund pending offers after post is cancelled or expired.
     */
    function claimOfferRefund(uint256 offerId) external nonReentrant {
        Offer storage offer = offers[offerId];
        require(offer.offerer == msg.sender, "Defense: not offerer");
        require(offer.status == OfferStatus.PENDING, "Defense: not pending");

        DefensePost memory post = posts[offer.postId];
        require(!post.active || block.timestamp >= post.deadline, "Defense: post still active");

        offer.status = OfferStatus.WITHDRAWN;

        (bool ok, ) = msg.sender.call{value: offer.amount}("");
        require(ok, "Defense: refund failed");

        emit FundsRefunded(offer.postId, msg.sender, offer.amount);
    }

    // -----------------------------------------------------------------------
    //  Views
    // -----------------------------------------------------------------------

    function getPost(uint256 postId) external view returns (DefensePost memory) {
        return posts[postId];
    }

    function getBackings(uint256 postId) external view returns (Backing[] memory) {
        return postBackings[postId];
    }

    function getBackingCount(uint256 postId) external view returns (uint256) {
        return postBackings[postId].length;
    }

    function getOffer(uint256 offerId) external view returns (Offer memory) {
        return offers[offerId];
    }

    function getOfferIds(uint256 postId) external view returns (uint256[] memory) {
        return postOfferIds[postId];
    }

    function availableStakeBps(uint256 postId) external view returns (uint256) {
        DefensePost memory post = posts[postId];
        return post.stakeOfferedBps - post.stakeSoldBps;
    }

    // -----------------------------------------------------------------------
    //  Internal
    // -----------------------------------------------------------------------

    function _requireActiveBacker(DefensePost storage post) internal view {
        require(post.active, "Defense: not active");
        require(block.timestamp < post.deadline, "Defense: expired");
        require(
            kycRegistry.isVerified(msg.sender, KYCRegistry.VerificationLevel.INDIVIDUAL),
            "Defense: backer KYC required"
        );
    }
}
