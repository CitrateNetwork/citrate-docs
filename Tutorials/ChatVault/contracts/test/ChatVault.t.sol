// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/ChatVault.sol";

contract ChatVaultTest is Test {
    ChatVault public vault;

    address public owner;
    address public alice;
    address public bob;
    address public charlie;

    uint256 constant MINT_FEE = 0.01 ether;
    string constant ENCRYPTED_CID = "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco";
    bytes32 constant METADATA_HASH = keccak256("test-conversation-hash-v1");
    uint256 constant MESSAGE_COUNT = 12;
    uint256 constant MODEL_ID = 42;

    // ─── Events ──────────────────────────────────────────────────────

    event ConversationMinted(
        uint256 indexed tokenId,
        address indexed creator,
        string encryptedCID,
        uint256 messageCount,
        uint256 modelId
    );

    event MintFeeUpdated(uint256 oldFee, uint256 newFee);

    // ─── Setup ───────────────────────────────────────────────────────

    function setUp() public {
        owner = address(this);
        alice = makeAddr("alice");
        bob = makeAddr("bob");
        charlie = makeAddr("charlie");

        vault = new ChatVault(MINT_FEE);

        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
        vm.deal(charlie, 10 ether);
    }

    // ─── Helper ──────────────────────────────────────────────────────

    function _mintAsAlice() internal returns (uint256) {
        vm.prank(alice);
        return vault.mintConversation{value: MINT_FEE}(
            ENCRYPTED_CID, METADATA_HASH, MESSAGE_COUNT, MODEL_ID
        );
    }

    function _mintAs(address user, string memory cid, uint256 msgCount, uint256 modelId)
        internal
        returns (uint256)
    {
        vm.prank(user);
        return vault.mintConversation{value: MINT_FEE}(
            cid, keccak256(abi.encodePacked(modelId, msgCount, user)), msgCount, modelId
        );
    }

    // ═══════════════════════════════════════════════════════════════
    // 1. DEPLOYMENT TESTS
    // ═══════════════════════════════════════════════════════════════

    function test_constructor_sets_name_and_symbol() public view {
        assertEq(vault.name(), "ChatVault");
        assertEq(vault.symbol(), "CVLT");
    }

    function test_constructor_sets_owner() public view {
        assertEq(vault.owner(), owner);
    }

    function test_constructor_sets_mint_fee() public view {
        assertEq(vault.mintFee(), MINT_FEE);
    }

    function test_initial_supply_is_zero() public view {
        assertEq(vault.totalSupply(), 0);
    }

    // ═══════════════════════════════════════════════════════════════
    // 2. MINTING — HAPPY PATHS
    // ═══════════════════════════════════════════════════════════════

    function test_mint_conversation_basic() public {
        uint256 tokenId = _mintAsAlice();

        assertEq(tokenId, 0);
        assertEq(vault.ownerOf(0), alice);
        assertEq(vault.totalSupply(), 1);
    }

    function test_mint_increments_token_id() public {
        _mintAsAlice();
        uint256 secondId = _mintAs(bob, "QmSecondCID123456789abcdef", 5, 99);

        assertEq(secondId, 1);
        assertEq(vault.totalSupply(), 2);
    }

    function test_mint_stores_conversation_data() public {
        uint256 tokenId = _mintAsAlice();
        ChatVault.Conversation memory conv = vault.getConversation(tokenId);

        assertEq(conv.encryptedCID, ENCRYPTED_CID);
        assertEq(conv.metadataHash, METADATA_HASH);
        assertEq(conv.messageCount, MESSAGE_COUNT);
        assertEq(conv.modelId, MODEL_ID);
        assertEq(conv.creator, alice);
        assertGt(conv.mintedAt, 0);
    }

    function test_mint_with_excess_fee() public {
        vm.prank(alice);
        vault.mintConversation{value: 1 ether}(
            ENCRYPTED_CID, METADATA_HASH, MESSAGE_COUNT, MODEL_ID
        );

        assertEq(address(vault).balance, 1 ether);
    }

    function test_mint_with_zero_model_id() public {
        vm.prank(alice);
        uint256 tokenId = vault.mintConversation{value: MINT_FEE}(
            ENCRYPTED_CID, METADATA_HASH, MESSAGE_COUNT, 0
        );

        ChatVault.Conversation memory conv = vault.getConversation(tokenId);
        assertEq(conv.modelId, 0);
    }

    function test_mint_with_large_message_count() public {
        vm.prank(alice);
        uint256 tokenId = vault.mintConversation{value: MINT_FEE}(
            ENCRYPTED_CID, METADATA_HASH, 999999, MODEL_ID
        );

        ChatVault.Conversation memory conv = vault.getConversation(tokenId);
        assertEq(conv.messageCount, 999999);
    }

    function test_mint_with_long_cid() public {
        string memory longCid = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi1234567890abcdef";
        vm.prank(alice);
        uint256 tokenId = vault.mintConversation{value: MINT_FEE}(
            longCid, METADATA_HASH, MESSAGE_COUNT, MODEL_ID
        );

        ChatVault.Conversation memory conv = vault.getConversation(tokenId);
        assertEq(conv.encryptedCID, longCid);
    }

    // ═══════════════════════════════════════════════════════════════
    // 3. MINTING — REVERTS
    // ═══════════════════════════════════════════════════════════════

    function test_mint_reverts_insufficient_fee() public {
        vm.prank(alice);
        vm.expectRevert("ChatVault: insufficient fee");
        vault.mintConversation{value: MINT_FEE - 1}(
            ENCRYPTED_CID, METADATA_HASH, MESSAGE_COUNT, MODEL_ID
        );
    }

    function test_mint_reverts_empty_cid() public {
        vm.prank(alice);
        vm.expectRevert("ChatVault: empty CID");
        vault.mintConversation{value: MINT_FEE}(
            "", METADATA_HASH, MESSAGE_COUNT, MODEL_ID
        );
    }

    function test_mint_reverts_zero_messages() public {
        vm.prank(alice);
        vm.expectRevert("ChatVault: zero messages");
        vault.mintConversation{value: MINT_FEE}(
            ENCRYPTED_CID, METADATA_HASH, 0, MODEL_ID
        );
    }

    function test_mint_reverts_no_value() public {
        vm.prank(alice);
        vm.expectRevert("ChatVault: insufficient fee");
        vault.mintConversation(
            ENCRYPTED_CID, METADATA_HASH, MESSAGE_COUNT, MODEL_ID
        );
    }

    // ═══════════════════════════════════════════════════════════════
    // 4. VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    function test_get_conversation_returns_correct_struct() public {
        uint256 tokenId = _mintAsAlice();
        ChatVault.Conversation memory conv = vault.getConversation(tokenId);

        assertEq(conv.encryptedCID, ENCRYPTED_CID);
        assertEq(conv.metadataHash, METADATA_HASH);
        assertEq(conv.messageCount, MESSAGE_COUNT);
        assertEq(conv.modelId, MODEL_ID);
        assertEq(conv.creator, alice);
    }

    function test_get_conversation_reverts_nonexistent() public {
        vm.expectRevert();
        vault.getConversation(999);
    }

    function test_get_conversations_by_creator() public {
        _mintAs(alice, "QmCid1_aaaaaaaaaaaaaaaaaa", 3, 1);
        _mintAs(alice, "QmCid2_bbbbbbbbbbbbbbbbbb", 7, 2);
        _mintAs(alice, "QmCid3_cccccccccccccccccc", 11, 3);

        uint256[] memory tokens = vault.getConversationsByCreator(alice);
        assertEq(tokens.length, 3);
        assertEq(tokens[0], 0);
        assertEq(tokens[1], 1);
        assertEq(tokens[2], 2);
    }

    function test_get_conversations_by_creator_empty() public view {
        uint256[] memory tokens = vault.getConversationsByCreator(bob);
        assertEq(tokens.length, 0);
    }

    function test_get_conversations_by_creator_isolation() public {
        _mintAs(alice, "QmAliceCID_aaaaaaaaaaaaa", 5, 10);
        _mintAs(bob, "QmBobCID_bbbbbbbbbbbbbbb", 8, 20);
        _mintAs(alice, "QmAliceCID2_aaaaaaaaaaaa", 3, 30);

        uint256[] memory aliceTokens = vault.getConversationsByCreator(alice);
        uint256[] memory bobTokens = vault.getConversationsByCreator(bob);

        assertEq(aliceTokens.length, 2);
        assertEq(bobTokens.length, 1);
        assertEq(aliceTokens[0], 0);
        assertEq(aliceTokens[1], 2);
        assertEq(bobTokens[0], 1);
    }

    // ═══════════════════════════════════════════════════════════════
    // 5. TOKEN URI / ON-CHAIN SVG
    // ═══════════════════════════════════════════════════════════════

    function test_token_uri_returns_base64_json() public {
        uint256 tokenId = _mintAsAlice();
        string memory uri = vault.tokenURI(tokenId);

        // Must start with data URI prefix
        bytes memory uriBytes = bytes(uri);
        // "data:application/json;base64," is 29 chars
        assertGt(uriBytes.length, 29);

        // Check prefix
        bytes memory prefix = bytes("data:application/json;base64,");
        for (uint256 i = 0; i < prefix.length; i++) {
            assertEq(uriBytes[i], prefix[i]);
        }
    }

    function test_token_uri_reverts_nonexistent() public {
        vm.expectRevert();
        vault.tokenURI(999);
    }

    function test_token_uri_changes_per_token() public {
        _mintAs(alice, "QmFirstConversation_aaaaaa", 5, 1);
        _mintAs(bob, "QmSecondConversation_bbbbb", 15, 2);

        string memory uri0 = vault.tokenURI(0);
        string memory uri1 = vault.tokenURI(1);

        // URIs must differ (different tokenId, CID, messageCount, etc.)
        assertNotEq(keccak256(bytes(uri0)), keccak256(bytes(uri1)));
    }

    // ═══════════════════════════════════════════════════════════════
    // 6. OWNER FUNCTIONS
    // ═══════════════════════════════════════════════════════════════

    function test_set_mint_fee_owner_only() public {
        vault.setMintFee(0.05 ether);
        assertEq(vault.mintFee(), 0.05 ether);
    }

    function test_set_mint_fee_reverts_non_owner() public {
        vm.prank(alice);
        vm.expectRevert();
        vault.setMintFee(0.05 ether);
    }

    function test_set_mint_fee_emits_event() public {
        vm.expectEmit(false, false, false, true);
        emit MintFeeUpdated(MINT_FEE, 0.05 ether);
        vault.setMintFee(0.05 ether);
    }

    function test_withdraw_sends_balance_to_owner() public {
        // Deploy a new vault with an EOA as owner (test contract can't receive ETH)
        address eoaOwner = makeAddr("eoaOwner");
        vm.prank(eoaOwner);
        ChatVault vault2 = new ChatVault(MINT_FEE);

        // Mint two conversations to accumulate fees
        vm.prank(alice);
        vault2.mintConversation{value: MINT_FEE}(ENCRYPTED_CID, METADATA_HASH, MESSAGE_COUNT, MODEL_ID);
        vm.prank(bob);
        vault2.mintConversation{value: MINT_FEE}("QmBobCID_bbbbbbbbbbbbbbb", METADATA_HASH, 5, 1);

        uint256 contractBalance = address(vault2).balance;
        assertEq(contractBalance, 2 * MINT_FEE);

        uint256 ownerBalanceBefore = eoaOwner.balance;
        vm.prank(eoaOwner);
        vault2.withdraw();

        assertEq(address(vault2).balance, 0);
        assertEq(eoaOwner.balance, ownerBalanceBefore + contractBalance);
    }

    function test_withdraw_reverts_non_owner() public {
        _mintAsAlice();
        vm.prank(alice);
        vm.expectRevert();
        vault.withdraw();
    }

    function test_withdraw_reverts_no_balance() public {
        vm.expectRevert("ChatVault: no balance");
        vault.withdraw();
    }

    // ═══════════════════════════════════════════════════════════════
    // 7. EVENTS
    // ═══════════════════════════════════════════════════════════════

    function test_mint_emits_conversation_minted() public {
        vm.prank(alice);
        vm.expectEmit(true, true, false, true);
        emit ConversationMinted(0, alice, ENCRYPTED_CID, MESSAGE_COUNT, MODEL_ID);
        vault.mintConversation{value: MINT_FEE}(
            ENCRYPTED_CID, METADATA_HASH, MESSAGE_COUNT, MODEL_ID
        );
    }

    // ═══════════════════════════════════════════════════════════════
    // 8. ERC-721 ENUMERABLE
    // ═══════════════════════════════════════════════════════════════

    function test_total_supply_increments() public {
        assertEq(vault.totalSupply(), 0);
        _mintAsAlice();
        assertEq(vault.totalSupply(), 1);
        _mintAs(bob, "QmBobConversation_bbbbbbb", 3, 5);
        assertEq(vault.totalSupply(), 2);
    }

    function test_token_by_index() public {
        _mintAsAlice();
        _mintAs(bob, "QmBobConversation_bbbbbbb", 3, 5);

        assertEq(vault.tokenByIndex(0), 0);
        assertEq(vault.tokenByIndex(1), 1);
    }

    function test_token_of_owner_by_index() public {
        _mintAs(alice, "QmConv1_aaaaaaaaaaaaaaaa", 3, 1);
        _mintAs(bob, "QmConv2_bbbbbbbbbbbbbbbb", 5, 2);
        _mintAs(alice, "QmConv3_cccccccccccccccc", 7, 3);

        assertEq(vault.tokenOfOwnerByIndex(alice, 0), 0);
        assertEq(vault.tokenOfOwnerByIndex(alice, 1), 2);
        assertEq(vault.tokenOfOwnerByIndex(bob, 0), 1);
    }

    // ═══════════════════════════════════════════════════════════════
    // 9. TRANSFER PRESERVES DATA
    // ═══════════════════════════════════════════════════════════════

    function test_transfer_preserves_conversation_data() public {
        uint256 tokenId = _mintAsAlice();

        vm.prank(alice);
        vault.transferFrom(alice, bob, tokenId);

        assertEq(vault.ownerOf(tokenId), bob);

        ChatVault.Conversation memory conv = vault.getConversation(tokenId);
        assertEq(conv.encryptedCID, ENCRYPTED_CID);
        assertEq(conv.creator, alice); // Creator stays the same
        assertEq(conv.messageCount, MESSAGE_COUNT);
    }

    // ═══════════════════════════════════════════════════════════════
    // 10. ZERO FEE DEPLOYMENT
    // ═══════════════════════════════════════════════════════════════

    function test_deploy_with_zero_fee() public {
        ChatVault freeVault = new ChatVault(0);
        assertEq(freeVault.mintFee(), 0);

        vm.prank(alice);
        uint256 tokenId = freeVault.mintConversation(
            ENCRYPTED_CID, METADATA_HASH, MESSAGE_COUNT, MODEL_ID
        );

        assertEq(tokenId, 0);
        assertEq(freeVault.ownerOf(0), alice);
    }

    // ═══════════════════════════════════════════════════════════════
    // 11. MULTIPLE MINTS STRESS
    // ═══════════════════════════════════════════════════════════════

    function test_sequential_mints_from_multiple_users() public {
        for (uint256 i = 0; i < 5; i++) {
            address user = i % 2 == 0 ? alice : bob;
            _mintAs(user, string(abi.encodePacked("QmCid_", bytes1(uint8(65 + i)))), i + 1, i * 10);
        }

        assertEq(vault.totalSupply(), 5);
        assertEq(vault.getConversationsByCreator(alice).length, 3);
        assertEq(vault.getConversationsByCreator(bob).length, 2);
    }

    // ═══════════════════════════════════════════════════════════════
    // 12. METADATA HASH INTEGRITY
    // ═══════════════════════════════════════════════════════════════

    function test_metadata_hash_stored_correctly() public {
        bytes32 expectedHash = keccak256(abi.encodePacked(MODEL_ID, MESSAGE_COUNT, alice));

        vm.prank(alice);
        uint256 tokenId = vault.mintConversation{value: MINT_FEE}(
            ENCRYPTED_CID, expectedHash, MESSAGE_COUNT, MODEL_ID
        );

        ChatVault.Conversation memory conv = vault.getConversation(tokenId);
        assertEq(conv.metadataHash, expectedHash);
    }

    function test_different_metadata_hashes() public {
        bytes32 hash1 = keccak256("conversation-1");
        bytes32 hash2 = keccak256("conversation-2");

        vm.prank(alice);
        uint256 id1 = vault.mintConversation{value: MINT_FEE}(
            "QmCid1_aaaaaaaaaaaaaaaaaa", hash1, 5, 1
        );

        vm.prank(alice);
        uint256 id2 = vault.mintConversation{value: MINT_FEE}(
            "QmCid2_bbbbbbbbbbbbbbbbbb", hash2, 10, 2
        );

        assertNotEq(
            vault.getConversation(id1).metadataHash,
            vault.getConversation(id2).metadataHash
        );
    }
}
