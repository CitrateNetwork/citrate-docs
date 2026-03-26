// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/KYCRegistry.sol";
import "../src/ServicePool.sol";
import "../src/PatentTiers.sol";
import "../src/PatentNFT.sol";
import "../src/PatentLicense.sol";
import "../src/PatentMarketplace.sol";
import "../src/PatentIPFS.sol";
import "../src/PatentIndex.sol";
import "../src/PatentAI.sol";
import "../src/LegalEntityRegistry.sol";
import "../src/LitigationFunding.sol";

contract PatentMintTest is Test {
    // -----------------------------------------------------------------------
    //  Contracts
    // -----------------------------------------------------------------------

    KYCRegistry public kyc;
    ServicePool public pool;
    PatentTiers public tiers;
    PatentNFT public patent;
    PatentLicense public license;
    PatentMarketplace public marketplace;
    PatentIPFS public ipfs;
    PatentIndex public index;
    PatentAI public ai;
    LegalEntityRegistry public legal;
    LitigationFunding public defense;

    // -----------------------------------------------------------------------
    //  Test accounts
    // -----------------------------------------------------------------------

    address public deployer;
    address public inventor;
    address public licensee;
    address public buyer;
    address public backer;
    address public operatorFund;
    address public platformFund;
    address public communityFund;

    // -----------------------------------------------------------------------
    //  Constants
    // -----------------------------------------------------------------------

    uint256 public constant STAKE_AMOUNT = 0.01 ether;  // ~$5 in test env
    string public constant TEST_TITLE = "Decentralized Widget Protocol";
    string public constant TEST_CID = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oczesues";
    bytes32 public constant TEST_HASH = keccak256("test-patent-content");
    uint256 public constant TEST_SIZE = 1_500_000; // 1.5 MB

    // -----------------------------------------------------------------------
    //  Setup
    // -----------------------------------------------------------------------

    function setUp() public {
        deployer = address(this);
        inventor = makeAddr("inventor");
        licensee = makeAddr("licensee");
        buyer = makeAddr("buyer");
        backer = makeAddr("backer");
        operatorFund = makeAddr("operators");
        platformFund = makeAddr("platform");
        communityFund = makeAddr("community");

        // Fund test accounts
        vm.deal(inventor, 100 ether);
        vm.deal(licensee, 100 ether);
        vm.deal(buyer, 100 ether);
        vm.deal(backer, 100 ether);

        // Deploy contracts
        kyc = new KYCRegistry();
        pool = new ServicePool(operatorFund, platformFund, communityFund);
        tiers = new PatentTiers(address(pool));
        patent = new PatentNFT(address(kyc), address(tiers), address(pool), STAKE_AMOUNT);
        license = new PatentLicense(address(patent), address(tiers), address(kyc));
        marketplace = new PatentMarketplace(address(patent), address(tiers), address(kyc));
        ipfs = new PatentIPFS();
        index = new PatentIndex();
        ai = new PatentAI();
        legal = new LegalEntityRegistry();
        defense = new LitigationFunding(address(patent), address(tiers), address(kyc));

        // Grant PatentNFT the MINTER_ROLE on PatentTiers
        tiers.grantRole(tiers.MINTER_ROLE(), address(patent));

        // KYC verify test accounts
        kyc.mintCredential(inventor, KYCRegistry.VerificationLevel.INDIVIDUAL, "US", keccak256("provider-inventor"));
        kyc.mintCredential(licensee, KYCRegistry.VerificationLevel.INDIVIDUAL, "US", keccak256("provider-licensee"));
        kyc.mintCredential(buyer, KYCRegistry.VerificationLevel.INDIVIDUAL, "JP", keccak256("provider-buyer"));
        kyc.mintCredential(backer, KYCRegistry.VerificationLevel.INDIVIDUAL, "DE", keccak256("provider-backer"));
    }

    // -----------------------------------------------------------------------
    //  Helper
    // -----------------------------------------------------------------------

    function _mintTestPatent() internal returns (uint256) {
        vm.prank(inventor);
        return patent.mintPatent{value: STAKE_AMOUNT}(
            TEST_TITLE,
            TEST_CID,
            TEST_HASH,
            TEST_SIZE,
            PatentNFT.PatentCategory.UTILITY,
            PatentTiers.ProtectionTier.BASIC,
            0
        );
    }

    function _mintDefendedPatent() internal returns (uint256) {
        vm.prank(inventor);
        return patent.mintPatent{value: STAKE_AMOUNT}(
            TEST_TITLE,
            TEST_CID,
            TEST_HASH,
            TEST_SIZE,
            PatentNFT.PatentCategory.SOFTWARE,
            PatentTiers.ProtectionTier.DEFENDED,
            1000 // 10% rev share
        );
    }

    // =======================================================================
    //  KYC TESTS
    // =======================================================================

    function testKYCMintCredential() public {
        address newUser = makeAddr("newUser");
        kyc.mintCredential(newUser, KYCRegistry.VerificationLevel.BUSINESS, "GB", keccak256("prov"));

        KYCRegistry.KYCCredential memory cred = kyc.getCredential(newUser);
        assertEq(uint(cred.level), uint(KYCRegistry.VerificationLevel.BUSINESS));
        assertEq(keccak256(bytes(cred.jurisdiction)), keccak256("GB"));
        assertTrue(cred.isActive);
    }

    function testKYCIsVerified() public view {
        assertTrue(kyc.isVerified(inventor, KYCRegistry.VerificationLevel.INDIVIDUAL));
        assertFalse(kyc.isVerified(inventor, KYCRegistry.VerificationLevel.BUSINESS));
        assertFalse(kyc.isVerified(makeAddr("unknown"), KYCRegistry.VerificationLevel.INDIVIDUAL));
    }

    function testKYCRevoke() public {
        kyc.revokeCredential(inventor);
        assertFalse(kyc.isVerified(inventor, KYCRegistry.VerificationLevel.INDIVIDUAL));
    }

    function testKYCExpiry() public {
        // Fast forward past expiry (365 days + 1)
        vm.warp(block.timestamp + 366 days);
        assertFalse(kyc.isVerified(inventor, KYCRegistry.VerificationLevel.INDIVIDUAL));
    }

    function testKYCRenew() public {
        vm.warp(block.timestamp + 366 days);
        assertFalse(kyc.isVerified(inventor, KYCRegistry.VerificationLevel.INDIVIDUAL));

        kyc.renewCredential(inventor, keccak256("renewed"));
        assertTrue(kyc.isVerified(inventor, KYCRegistry.VerificationLevel.INDIVIDUAL));
    }

    function testKYCDaysUntilExpiry() public view {
        uint256 days_ = kyc.daysUntilExpiry(inventor);
        assertGt(days_, 360);
    }

    // =======================================================================
    //  PATENT NFT TESTS
    // =======================================================================

    function testMintPatent() public {
        uint256 tokenId = _mintTestPatent();
        assertEq(tokenId, 1);
        assertEq(patent.ownerOf(tokenId), inventor);
        assertEq(patent.totalSupply(), 1);
    }

    function testMintEmitsEvent() public {
        vm.prank(inventor);
        vm.expectEmit(true, true, false, true);
        emit PatentNFT.PatentMinted(1, inventor, TEST_TITLE, TEST_CID, PatentNFT.PatentCategory.UTILITY);
        patent.mintPatent{value: STAKE_AMOUNT}(
            TEST_TITLE, TEST_CID, TEST_HASH, TEST_SIZE,
            PatentNFT.PatentCategory.UTILITY,
            PatentTiers.ProtectionTier.BASIC, 0
        );
    }

    function testMintRequiresKYC() public {
        address noKyc = makeAddr("noKyc");
        vm.deal(noKyc, 1 ether);
        vm.prank(noKyc);
        vm.expectRevert("PatentNFT: KYC required");
        patent.mintPatent{value: STAKE_AMOUNT}(
            TEST_TITLE, TEST_CID, TEST_HASH, TEST_SIZE,
            PatentNFT.PatentCategory.UTILITY,
            PatentTiers.ProtectionTier.BASIC, 0
        );
    }

    function testMintRequiresStake() public {
        vm.prank(inventor);
        vm.expectRevert("PatentNFT: insufficient stake");
        patent.mintPatent{value: 0}(
            TEST_TITLE, TEST_CID, TEST_HASH, TEST_SIZE,
            PatentNFT.PatentCategory.UTILITY,
            PatentTiers.ProtectionTier.BASIC, 0
        );
    }

    function testMintRejectsEmptyTitle() public {
        vm.prank(inventor);
        vm.expectRevert("PatentNFT: empty title");
        patent.mintPatent{value: STAKE_AMOUNT}(
            "", TEST_CID, TEST_HASH, TEST_SIZE,
            PatentNFT.PatentCategory.UTILITY,
            PatentTiers.ProtectionTier.BASIC, 0
        );
    }

    function testMintRejectsEmptyCID() public {
        vm.prank(inventor);
        vm.expectRevert("PatentNFT: empty CID");
        patent.mintPatent{value: STAKE_AMOUNT}(
            TEST_TITLE, "", TEST_HASH, TEST_SIZE,
            PatentNFT.PatentCategory.UTILITY,
            PatentTiers.ProtectionTier.BASIC, 0
        );
    }

    function testMintRefundsExcess() public {
        uint256 balBefore = inventor.balance;
        vm.prank(inventor);
        patent.mintPatent{value: 1 ether}(
            TEST_TITLE, TEST_CID, TEST_HASH, TEST_SIZE,
            PatentNFT.PatentCategory.UTILITY,
            PatentTiers.ProtectionTier.BASIC, 0
        );
        // Should have been refunded everything except STAKE_AMOUNT
        assertEq(inventor.balance, balBefore - STAKE_AMOUNT);
    }

    function testGetPatentInfo() public {
        uint256 tokenId = _mintTestPatent();
        PatentNFT.PatentInfo memory info = patent.getPatentInfo(tokenId);
        assertEq(info.title, TEST_TITLE);
        assertEq(info.ipfsCID, TEST_CID);
        assertEq(info.contentHash, TEST_HASH);
        assertEq(info.sizeBytes, TEST_SIZE);
        assertEq(info.inventor, inventor);
        assertEq(uint(info.category), uint(PatentNFT.PatentCategory.UTILITY));
    }

    function testGetPatentsByInventor() public {
        _mintTestPatent();
        vm.prank(inventor);
        patent.mintPatent{value: STAKE_AMOUNT}(
            "Second Patent", TEST_CID, TEST_HASH, TEST_SIZE,
            PatentNFT.PatentCategory.SOFTWARE,
            PatentTiers.ProtectionTier.BASIC, 0
        );
        uint256[] memory ids = patent.getPatentsByInventor(inventor);
        assertEq(ids.length, 2);
    }

    function testTokenURI() public {
        uint256 tokenId = _mintTestPatent();
        string memory uri = patent.tokenURI(tokenId);
        assertTrue(bytes(uri).length > 0);
        // Should start with data:application/json;base64,
        bytes memory prefix = bytes("data:application/json;base64,");
        bytes memory uriBytes = bytes(uri);
        for (uint i = 0; i < prefix.length; i++) {
            assertEq(uriBytes[i], prefix[i]);
        }
    }

    // =======================================================================
    //  STAKING TESTS
    // =======================================================================

    function testStakeRefund() public {
        uint256 tokenId = _mintTestPatent();

        // Cannot refund before lock expires
        vm.prank(inventor);
        vm.expectRevert("PatentNFT: still locked");
        patent.refundStake(tokenId);

        // Fast forward past lock
        vm.warp(block.timestamp + 91 days);
        uint256 balBefore = inventor.balance;
        vm.prank(inventor);
        patent.refundStake(tokenId);
        assertEq(inventor.balance, balBefore + STAKE_AMOUNT);
    }

    function testStakeBurn() public {
        uint256 tokenId = _mintTestPatent();
        uint256 poolBefore = address(pool).balance;

        patent.burnStake(tokenId);
        assertEq(address(pool).balance, poolBefore + STAKE_AMOUNT);
    }

    function testDoubleRefundReverts() public {
        uint256 tokenId = _mintTestPatent();
        vm.warp(block.timestamp + 91 days);
        vm.prank(inventor);
        patent.refundStake(tokenId);

        vm.prank(inventor);
        vm.expectRevert("PatentNFT: already settled");
        patent.refundStake(tokenId);
    }

    // =======================================================================
    //  TIER TESTS
    // =======================================================================

    function testBasicTier() public {
        uint256 tokenId = _mintTestPatent();
        PatentTiers.PatentTierInfo memory info = tiers.getTier(tokenId);
        assertEq(uint(info.tier), uint(PatentTiers.ProtectionTier.BASIC));
        assertEq(info.revShareBps, 0);
    }

    function testProtectedTier() public {
        vm.prank(inventor);
        uint256 tokenId = patent.mintPatent{value: STAKE_AMOUNT}(
            TEST_TITLE, TEST_CID, TEST_HASH, TEST_SIZE,
            PatentNFT.PatentCategory.UTILITY,
            PatentTiers.ProtectionTier.PROTECTED,
            400 // 4%
        );
        PatentTiers.PatentTierInfo memory info = tiers.getTier(tokenId);
        assertEq(uint(info.tier), uint(PatentTiers.ProtectionTier.PROTECTED));
        assertEq(info.revShareBps, 400);
    }

    function testTierUpgrade() public {
        uint256 tokenId = _mintTestPatent();

        vm.prank(inventor);
        tiers.upgradeTier(tokenId, PatentTiers.ProtectionTier.DEFENDED, 1000);

        PatentTiers.PatentTierInfo memory info = tiers.getTier(tokenId);
        assertEq(uint(info.tier), uint(PatentTiers.ProtectionTier.DEFENDED));
    }

    function testTierDowngradeReverts() public {
        uint256 tokenId = _mintDefendedPatent();

        vm.prank(inventor);
        vm.expectRevert("Tiers: can only upgrade");
        tiers.upgradeTier(tokenId, PatentTiers.ProtectionTier.BASIC, 0);
    }

    function testRevShareOutOfRange() public {
        vm.prank(inventor);
        vm.expectRevert("Tiers: revShare out of range");
        patent.mintPatent{value: STAKE_AMOUNT}(
            TEST_TITLE, TEST_CID, TEST_HASH, TEST_SIZE,
            PatentNFT.PatentCategory.UTILITY,
            PatentTiers.ProtectionTier.PROTECTED,
            100 // 1% — below 3% minimum
        );
    }

    // =======================================================================
    //  SERVICE POOL TESTS
    // =======================================================================

    function testPoolDistribution() public {
        // Fund the pool
        vm.deal(address(pool), 10 ether);

        pool.distribute();

        assertEq(operatorFund.balance, 7 ether);   // 70%
        assertEq(platformFund.balance, 2 ether);    // 20%
        assertEq(communityFund.balance, 1 ether);   // 10%
    }

    // =======================================================================
    //  LICENSE TESTS
    // =======================================================================

    function testCreateLicense() public {
        uint256 tokenId = _mintTestPatent();

        vm.prank(inventor);
        uint256 licId = license.createLicense(
            tokenId,
            licensee,
            PatentLicense.LicenseType.NON_EXCLUSIVE,
            365 days,
            hex"deadbeef"
        );

        assertTrue(license.isLicenseActive(licId));
        assertTrue(license.hasAccess(tokenId, licensee));
    }

    function testLicenseRequiresKYC() public {
        uint256 tokenId = _mintTestPatent();
        address noKyc = makeAddr("noKyc");

        vm.prank(inventor);
        vm.expectRevert("License: licensee KYC required");
        license.createLicense(
            tokenId, noKyc,
            PatentLicense.LicenseType.NON_EXCLUSIVE,
            365 days, hex"aa"
        );
    }

    function testExclusiveLicenseBlocks() public {
        uint256 tokenId = _mintTestPatent();

        vm.prank(inventor);
        license.createLicense(
            tokenId, licensee,
            PatentLicense.LicenseType.EXCLUSIVE,
            365 days, hex"aa"
        );

        // Second license should fail
        vm.prank(inventor);
        vm.expectRevert("License: blocked by exclusive");
        license.createLicense(
            tokenId, buyer,
            PatentLicense.LicenseType.NON_EXCLUSIVE,
            365 days, hex"bb"
        );
    }

    function testRevokeLicense() public {
        uint256 tokenId = _mintTestPatent();

        vm.prank(inventor);
        uint256 licId = license.createLicense(
            tokenId, licensee,
            PatentLicense.LicenseType.NON_EXCLUSIVE,
            365 days, hex"aa"
        );

        vm.prank(inventor);
        license.revokeLicense(licId);
        assertFalse(license.isLicenseActive(licId));
    }

    // =======================================================================
    //  MARKETPLACE TESTS
    // =======================================================================

    function testListAndBuy() public {
        uint256 tokenId = _mintTestPatent();

        // Approve marketplace
        vm.prank(inventor);
        patent.approve(address(marketplace), tokenId);

        // List
        vm.prank(inventor);
        uint256 listId = marketplace.listPatent(tokenId, 1 ether, 500);

        // Buy
        vm.prank(buyer);
        marketplace.buyPatent{value: 1 ether}(listId);

        assertEq(patent.ownerOf(tokenId), buyer);
    }

    function testBuyRequiresKYC() public {
        uint256 tokenId = _mintTestPatent();
        vm.prank(inventor);
        patent.approve(address(marketplace), tokenId);
        vm.prank(inventor);
        uint256 listId = marketplace.listPatent(tokenId, 1 ether, 500);

        address noKyc = makeAddr("noKyc");
        vm.deal(noKyc, 10 ether);
        vm.prank(noKyc);
        vm.expectRevert("Market: buyer KYC required");
        marketplace.buyPatent{value: 1 ether}(listId);
    }

    function testPlaceAndAcceptBid() public {
        uint256 tokenId = _mintTestPatent();

        vm.prank(inventor);
        patent.approve(address(marketplace), tokenId);

        // Place bid
        vm.prank(buyer);
        uint256 bidId = marketplace.placeBid{value: 2 ether}(tokenId);

        // Accept bid
        vm.prank(inventor);
        marketplace.acceptBid(bidId);

        assertEq(patent.ownerOf(tokenId), buyer);
    }

    function testCancelBid() public {
        uint256 tokenId = _mintTestPatent();

        vm.prank(buyer);
        uint256 bidId = marketplace.placeBid{value: 2 ether}(tokenId);

        uint256 balBefore = buyer.balance;
        vm.prank(buyer);
        marketplace.cancelBid(bidId);
        assertEq(buyer.balance, balBefore + 2 ether);
    }

    // =======================================================================
    //  IPFS TESTS
    // =======================================================================

    function testRegisterDocument() public {
        ipfs.registerPatentDocument(1, "bafybeiabc123", 500_000);
        PatentIPFS.PatentDocument memory doc = ipfs.getDocument("bafybeiabc123");
        assertEq(doc.patentId, 1);
        assertEq(doc.sizeBytes, 500_000);
        assertEq(uint(doc.tier), uint(PatentIPFS.DocumentTier.ACTIVE));
    }

    function testDuplicateCIDReverts() public {
        ipfs.registerPatentDocument(1, "bafybeiabc123", 500_000);
        vm.expectRevert("IPFS: CID already registered");
        ipfs.registerPatentDocument(2, "bafybeiabc123", 300_000);
    }

    function testDocumentTierDegrades() public {
        ipfs.registerPatentDocument(1, "bafybeiold", 500_000);

        // Still active at year 1
        vm.warp(block.timestamp + 365 days);
        assertEq(uint(ipfs.currentTier("bafybeiold")), uint(PatentIPFS.DocumentTier.ACTIVE));

        // Standard at year 3
        vm.warp(block.timestamp + 2 * 365 days);
        assertEq(uint(ipfs.currentTier("bafybeiold")), uint(PatentIPFS.DocumentTier.STANDARD));

        // Historical at year 11
        vm.warp(block.timestamp + 8 * 365 days);
        assertEq(uint(ipfs.currentTier("bafybeiold")), uint(PatentIPFS.DocumentTier.HISTORICAL));
    }

    // =======================================================================
    //  INDEX TESTS
    // =======================================================================

    function testAddToIndex() public {
        index.addToIndex(1, TEST_CID, 0); // category 0 = UTILITY
        assertEq(index.totalEntries(), 1);

        uint256[] memory utilityPatents = index.getByCategory(0);
        assertEq(utilityPatents.length, 1);
        assertEq(utilityPatents[0], 1);
    }

    function testMerkleRootUpdates() public {
        bytes32 root1 = index.getMerkleRoot();
        index.addToIndex(1, TEST_CID, 0);
        bytes32 root2 = index.getMerkleRoot();
        assertTrue(root1 != root2);

        index.addToIndex(2, "bafybeiabc456", 4);
        bytes32 root3 = index.getMerkleRoot();
        assertTrue(root2 != root3);
    }

    // =======================================================================
    //  AI TESTS
    // =======================================================================

    function testClassifyPatent() public {
        ai.classifyPatent(1, PatentAI.PatentCategory.SOFTWARE, 9500, keccak256("embedding"));

        PatentAI.Classification memory cls = ai.getClassification(1);
        assertEq(uint(cls.category), uint(PatentAI.PatentCategory.SOFTWARE));
        assertEq(cls.confidence, 9500);
        assertEq(ai.totalClassified(), 1);
    }

    function testScorePriorArt() public {
        ai.scorePriorArt(1, 2, 8700);
        PatentAI.PriorArtScore memory score = ai.getPriorArtScore(1, 2);
        assertEq(score.similarity, 8700);
    }

    // =======================================================================
    //  LEGAL ENTITY TESTS
    // =======================================================================

    function testRegisterEntity() public {
        string[] memory jurisdictions = new string[](2);
        jurisdictions[0] = "US";
        jurisdictions[1] = "GB";

        LegalEntityRegistry.IPType[] memory specs = new LegalEntityRegistry.IPType[](1);
        specs[0] = LegalEntityRegistry.IPType.PATENT;

        uint256 entityId = legal.registerEntity(
            "Baker & Associates",
            "bafybeifirm123",
            makeAddr("firm"),
            jurisdictions,
            specs
        );

        LegalEntityRegistry.LegalEntity memory entity = legal.getEntity(entityId);
        assertEq(entity.name, "Baker & Associates");
        assertTrue(entity.isActive);
    }

    function testLegalDisclaimer() public view {
        string memory d = legal.getDisclaimer();
        assertTrue(bytes(d).length > 0);
    }

    // =======================================================================
    //  LITIGATION FUNDING TESTS — Three Modes
    // =======================================================================

    function _createDefensePost() internal returns (uint256 postId) {
        uint256 tokenId = _mintDefendedPatent();
        vm.prank(inventor);
        postId = defense.createDefensePost(
            tokenId,
            "bafybeicase123",
            1500,           // 15% stake offered
            0.01 ether,     // price per basis point
            5 ether,        // funding goal
            30 days
        );
    }

    function testCreateDefensePost() public {
        uint256 postId = _createDefensePost();

        LitigationFunding.DefensePost memory post = defense.getPost(postId);
        assertEq(post.fundingGoal, 5 ether);
        assertEq(post.stakeOfferedBps, 1500);
        assertEq(post.pricePerBps, 0.01 ether);
        assertTrue(post.active);
    }

    function testDefenseRequiresDefendedTier() public {
        uint256 tokenId = _mintTestPatent(); // BASIC tier

        vm.prank(inventor);
        vm.expectRevert("Defense: DEFENDED tier required");
        defense.createDefensePost(tokenId, "bafybei123", 1500, 0.01 ether, 5 ether, 30 days);
    }

    // --- Mode 1: DONATE ---

    function testDonate() public {
        uint256 postId = _createDefensePost();
        uint256 inventorBal = inventor.balance;

        vm.prank(backer);
        defense.donate{value: 2 ether}(postId);

        LitigationFunding.DefensePost memory post = defense.getPost(postId);
        assertEq(post.fundingRaised, 2 ether);

        // Inventor received funds immediately
        assertEq(inventor.balance, inventorBal + 2 ether);

        // Backer gets 0 stake (donation)
        LitigationFunding.Backing[] memory backings = defense.getBackings(postId);
        assertEq(backings.length, 1);
        assertEq(backings[0].stakeBps, 0);
        assertEq(uint(backings[0].backingType), uint(LitigationFunding.BackingType.DONATE));
    }

    // --- Mode 2: BUY_STAKE ---

    function testBuyStake() public {
        uint256 postId = _createDefensePost();
        uint256 inventorBal = inventor.balance;

        // Buy 500 bps (5%) at 0.01 ether per bps = 5 ether cost
        vm.prank(backer);
        defense.buyStake{value: 5 ether}(postId, 500);

        LitigationFunding.DefensePost memory post = defense.getPost(postId);
        assertEq(post.stakeSoldBps, 500);
        assertEq(post.fundingRaised, 5 ether);

        // Inventor received funds
        assertEq(inventor.balance, inventorBal + 5 ether);

        // Backer recorded with stake
        LitigationFunding.Backing[] memory backings = defense.getBackings(postId);
        assertEq(backings[0].stakeBps, 500);
        assertEq(uint(backings[0].backingType), uint(LitigationFunding.BackingType.BUY_STAKE));
    }

    function testBuyStakeRefundsOverpayment() public {
        uint256 postId = _createDefensePost();
        uint256 backerBal = backer.balance;

        // Buy 100 bps at 0.01 ether = 1 ether cost, send 3 ether
        vm.prank(backer);
        defense.buyStake{value: 3 ether}(postId, 100);

        // Should have been refunded 2 ether
        assertEq(backer.balance, backerBal - 1 ether);
    }

    function testBuyStakeExceedsAvailable() public {
        uint256 postId = _createDefensePost(); // 1500 bps available

        vm.prank(backer);
        vm.expectRevert("Defense: exceeds available stake");
        defense.buyStake{value: 100 ether}(postId, 2000); // More than 1500
    }

    // --- Mode 3: OFFER ---

    function testMakeAndAcceptOffer() public {
        uint256 postId = _createDefensePost();
        uint256 inventorBal = inventor.balance;

        // Backer offers 3 ether for 300 bps (3%)
        vm.prank(backer);
        uint256 offerId = defense.makeOffer{value: 3 ether}(postId, 300);

        // Verify offer is pending, SALT held in escrow
        LitigationFunding.Offer memory offer = defense.getOffer(offerId);
        assertEq(offer.amount, 3 ether);
        assertEq(offer.requestedBps, 300);
        assertEq(uint(offer.status), uint(LitigationFunding.OfferStatus.PENDING));

        // Inventor accepts
        vm.prank(inventor);
        defense.acceptOffer(offerId);

        // Verify state
        offer = defense.getOffer(offerId);
        assertEq(uint(offer.status), uint(LitigationFunding.OfferStatus.ACCEPTED));

        LitigationFunding.DefensePost memory post = defense.getPost(postId);
        assertEq(post.stakeSoldBps, 300);
        assertEq(post.fundingRaised, 3 ether);

        // Inventor received escrowed SALT
        assertEq(inventor.balance, inventorBal + 3 ether);
    }

    function testRejectOffer() public {
        uint256 postId = _createDefensePost();
        uint256 backerBal = backer.balance;

        vm.prank(backer);
        uint256 offerId = defense.makeOffer{value: 2 ether}(postId, 200);

        // Backer's SALT is in escrow
        assertEq(backer.balance, backerBal - 2 ether);

        // Inventor rejects
        vm.prank(inventor);
        defense.rejectOffer(offerId);

        // Backer gets refund
        assertEq(backer.balance, backerBal);

        LitigationFunding.Offer memory offer = defense.getOffer(offerId);
        assertEq(uint(offer.status), uint(LitigationFunding.OfferStatus.REJECTED));
    }

    function testWithdrawOffer() public {
        uint256 postId = _createDefensePost();
        uint256 backerBal = backer.balance;

        vm.prank(backer);
        uint256 offerId = defense.makeOffer{value: 1 ether}(postId, 100);

        vm.prank(backer);
        defense.withdrawOffer(offerId);

        assertEq(backer.balance, backerBal);
        LitigationFunding.Offer memory offer = defense.getOffer(offerId);
        assertEq(uint(offer.status), uint(LitigationFunding.OfferStatus.WITHDRAWN));
    }

    function testClaimOfferRefundAfterExpiry() public {
        uint256 postId = _createDefensePost();
        uint256 backerBal = backer.balance;

        vm.prank(backer);
        uint256 offerId = defense.makeOffer{value: 4 ether}(postId, 400);

        // Fast forward past deadline
        vm.warp(block.timestamp + 31 days);

        vm.prank(backer);
        defense.claimOfferRefund(offerId);

        assertEq(backer.balance, backerBal);
    }

    // --- KYC gating ---

    function testBackerKYCRequired() public {
        uint256 postId = _createDefensePost();

        address noKyc = makeAddr("noKycBacker");
        vm.deal(noKyc, 10 ether);

        // Donate
        vm.prank(noKyc);
        vm.expectRevert("Defense: backer KYC required");
        defense.donate{value: 1 ether}(postId);

        // Buy
        vm.prank(noKyc);
        vm.expectRevert("Defense: backer KYC required");
        defense.buyStake{value: 1 ether}(postId, 100);

        // Offer
        vm.prank(noKyc);
        vm.expectRevert("Defense: backer KYC required");
        defense.makeOffer{value: 1 ether}(postId, 100);
    }

    // --- Mixed modes ---

    function testMixedBackingModes() public {
        uint256 postId = _createDefensePost();

        // Backer donates
        vm.prank(backer);
        defense.donate{value: 1 ether}(postId);

        // Buyer purchases 200 bps
        vm.prank(buyer);
        defense.buyStake{value: 2 ether}(postId, 200);

        // Licensee makes offer for 300 bps
        vm.prank(licensee);
        uint256 offerId = defense.makeOffer{value: 1.5 ether}(postId, 300);

        // Inventor accepts offer
        vm.prank(inventor);
        defense.acceptOffer(offerId);

        // Verify totals
        LitigationFunding.DefensePost memory post = defense.getPost(postId);
        assertEq(post.stakeSoldBps, 500); // 200 + 300
        assertEq(post.fundingRaised, 1 ether + 2 ether + 1.5 ether); // donate + buy + offer
        assertEq(defense.availableStakeBps(postId), 1000); // 1500 - 500
    }

    // =======================================================================
    //  INTEGRATION: Full flow
    // =======================================================================

    function testFullPatentLifecycle() public {
        // 1. KYC already done in setUp

        // 2. Mint patent with PROTECTED tier
        vm.prank(inventor);
        uint256 tokenId = patent.mintPatent{value: STAKE_AMOUNT}(
            "AI-Powered Search Algorithm",
            "bafybeilifecycle",
            keccak256("lifecycle-content"),
            2_000_000,
            PatentNFT.PatentCategory.SOFTWARE,
            PatentTiers.ProtectionTier.PROTECTED,
            400 // 4% rev share
        );

        // 3. Register IPFS document
        ipfs.registerPatentDocument(tokenId, "bafybeilifecycle", 2_000_000);

        // 4. Index the patent
        index.addToIndex(tokenId, "bafybeilifecycle", 4); // SOFTWARE = 4

        // 5. Classify with AI
        ai.classifyPatent(tokenId, PatentAI.PatentCategory.SOFTWARE, 9200, keccak256("emb"));

        // 6. Create a license
        vm.prank(inventor);
        uint256 licId = license.createLicense(
            tokenId, licensee,
            PatentLicense.LicenseType.NON_EXCLUSIVE,
            365 days,
            hex"abcd1234"
        );

        // 7. Verify access
        assertTrue(license.hasAccess(tokenId, licensee));
        assertTrue(license.isLicenseActive(licId));

        // 8. Upgrade to DEFENDED
        vm.prank(inventor);
        tiers.upgradeTier(tokenId, PatentTiers.ProtectionTier.DEFENDED, 1000);

        // 9. Verify tier
        PatentTiers.PatentTierInfo memory tierInfo = tiers.getTier(tokenId);
        assertEq(uint(tierInfo.tier), uint(PatentTiers.ProtectionTier.DEFENDED));

        // 10. Refund stake after lock
        vm.warp(block.timestamp + 91 days);
        vm.prank(inventor);
        patent.refundStake(tokenId);
    }
}
