// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/ModelNFT.sol";

contract ModelNFTTest is Test {
    ModelNFT public nft;
    address public owner;
    address public alice;
    address public bob;

    uint256 constant MINT_FEE = 0.01 ether;

    // Common test model data
    string constant MODEL_NAME = "ResNet-50";
    string constant FRAMEWORK = "PyTorch";
    string constant IPFS_CID = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG";
    bytes32 constant MODEL_HASH = keccak256("test-model-weights-v1");
    uint256 constant SIZE_BYTES = 97_000_000; // ~97 MB

    function setUp() public {
        owner = address(this);
        alice = makeAddr("alice");
        bob = makeAddr("bob");

        nft = new ModelNFT(MINT_FEE);

        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
    }

    // -----------------------------------------------------------------------
    //  Minting — Happy paths
    // -----------------------------------------------------------------------

    function test_mint_model_basic() public {
        vm.prank(alice);
        uint256 tokenId = nft.mintModel{value: MINT_FEE}(
            MODEL_NAME, FRAMEWORK, IPFS_CID, MODEL_HASH, SIZE_BYTES
        );

        assertEq(tokenId, 0);
        assertEq(nft.ownerOf(0), alice);

        ModelNFT.ModelInfo memory info = nft.getModelInfo(0);
        assertEq(info.name, MODEL_NAME);
        assertEq(info.framework, FRAMEWORK);
        assertEq(info.ipfsCID, IPFS_CID);
        assertEq(info.modelHash, MODEL_HASH);
        assertEq(info.sizeBytes, SIZE_BYTES);
        assertEq(info.creator, alice);
        assertGt(info.createdAt, 0);
    }

    function test_mint_model_increments_token_id() public {
        vm.startPrank(alice);

        uint256 id0 = nft.mintModel{value: MINT_FEE}(
            "Model A", "ONNX", "QmCID_A", keccak256("a"), 100
        );
        uint256 id1 = nft.mintModel{value: MINT_FEE}(
            "Model B", "CoreML", "QmCID_B", keccak256("b"), 200
        );
        uint256 id2 = nft.mintModel{value: MINT_FEE}(
            "Model C", "TensorFlow", "QmCID_C", keccak256("c"), 300
        );

        vm.stopPrank();

        assertEq(id0, 0);
        assertEq(id1, 1);
        assertEq(id2, 2);
    }

    function test_mint_model_emits_event() public {
        vm.prank(alice);

        vm.expectEmit(true, true, false, true);
        emit ModelNFT.ModelMinted(0, alice, IPFS_CID);

        nft.mintModel{value: MINT_FEE}(
            MODEL_NAME, FRAMEWORK, IPFS_CID, MODEL_HASH, SIZE_BYTES
        );
    }

    function test_mint_with_excess_fee() public {
        vm.prank(alice);
        uint256 tokenId = nft.mintModel{value: 1 ether}(
            MODEL_NAME, FRAMEWORK, IPFS_CID, MODEL_HASH, SIZE_BYTES
        );
        assertEq(tokenId, 0);
        // Excess stays in contract (owner can withdraw)
        assertEq(address(nft).balance, 1 ether);
    }

    // -----------------------------------------------------------------------
    //  Minting — Reverts
    // -----------------------------------------------------------------------

    function test_mint_model_requires_fee() public {
        vm.prank(alice);
        vm.expectRevert("ModelNFT: insufficient fee");
        nft.mintModel{value: MINT_FEE - 1}(
            MODEL_NAME, FRAMEWORK, IPFS_CID, MODEL_HASH, SIZE_BYTES
        );
    }

    function test_mint_model_empty_name_reverts() public {
        vm.prank(alice);
        vm.expectRevert("ModelNFT: empty name");
        nft.mintModel{value: MINT_FEE}(
            "", FRAMEWORK, IPFS_CID, MODEL_HASH, SIZE_BYTES
        );
    }

    function test_mint_model_empty_cid_reverts() public {
        vm.prank(alice);
        vm.expectRevert("ModelNFT: empty CID");
        nft.mintModel{value: MINT_FEE}(
            MODEL_NAME, FRAMEWORK, "", MODEL_HASH, SIZE_BYTES
        );
    }

    function test_mint_model_zero_hash_reverts() public {
        vm.prank(alice);
        vm.expectRevert("ModelNFT: zero hash");
        nft.mintModel{value: MINT_FEE}(
            MODEL_NAME, FRAMEWORK, IPFS_CID, bytes32(0), SIZE_BYTES
        );
    }

    // -----------------------------------------------------------------------
    //  View functions
    // -----------------------------------------------------------------------

    function test_get_model_info() public {
        vm.prank(alice);
        nft.mintModel{value: MINT_FEE}(
            "BERT", "ONNX", "QmBERT_CID", keccak256("bert"), 440_000_000
        );

        ModelNFT.ModelInfo memory info = nft.getModelInfo(0);
        assertEq(info.name, "BERT");
        assertEq(info.framework, "ONNX");
        assertEq(info.ipfsCID, "QmBERT_CID");
        assertEq(info.sizeBytes, 440_000_000);
    }

    function test_get_models_by_creator() public {
        vm.startPrank(alice);
        nft.mintModel{value: MINT_FEE}("M1", "A", "C1", keccak256("1"), 100);
        nft.mintModel{value: MINT_FEE}("M2", "B", "C2", keccak256("2"), 200);
        nft.mintModel{value: MINT_FEE}("M3", "C", "C3", keccak256("3"), 300);
        vm.stopPrank();

        uint256[] memory tokens = nft.getModelsByCreator(alice);
        assertEq(tokens.length, 3);
        assertEq(tokens[0], 0);
        assertEq(tokens[1], 1);
        assertEq(tokens[2], 2);
    }

    function test_get_models_by_creator_empty() public view {
        uint256[] memory tokens = nft.getModelsByCreator(alice);
        assertEq(tokens.length, 0);
    }

    function test_get_models_by_creator_multiple_creators() public {
        vm.prank(alice);
        nft.mintModel{value: MINT_FEE}("Alice-M", "X", "Ca", keccak256("a"), 100);

        vm.prank(bob);
        nft.mintModel{value: MINT_FEE}("Bob-M", "Y", "Cb", keccak256("b"), 200);

        assertEq(nft.getModelsByCreator(alice).length, 1);
        assertEq(nft.getModelsByCreator(bob).length, 1);
        assertEq(nft.getModelsByCreator(alice)[0], 0);
        assertEq(nft.getModelsByCreator(bob)[0], 1);
    }

    // -----------------------------------------------------------------------
    //  tokenURI (on-chain SVG)
    // -----------------------------------------------------------------------

    function test_token_uri_on_chain() public {
        vm.prank(alice);
        nft.mintModel{value: MINT_FEE}(
            MODEL_NAME, FRAMEWORK, IPFS_CID, MODEL_HASH, SIZE_BYTES
        );

        string memory uri = nft.tokenURI(0);

        // Should start with data:application/json;base64,
        bytes memory uriBytes = bytes(uri);
        // Check prefix
        string memory prefix = "data:application/json;base64,";
        bytes memory prefixBytes = bytes(prefix);
        for (uint256 i = 0; i < prefixBytes.length; i++) {
            assertEq(uriBytes[i], prefixBytes[i]);
        }

        // URI should be non-trivially long (contains SVG + metadata)
        assertGt(uriBytes.length, 200);
    }

    function test_token_uri_nonexistent_reverts() public {
        vm.expectRevert();
        nft.tokenURI(999);
    }

    // -----------------------------------------------------------------------
    //  Owner functions
    // -----------------------------------------------------------------------

    function test_set_mint_fee_owner_only() public {
        // Owner can set
        nft.setMintFee(0.05 ether);
        assertEq(nft.mintFee(), 0.05 ether);

        // Non-owner reverts
        vm.prank(alice);
        vm.expectRevert();
        nft.setMintFee(0);
    }

    function test_set_mint_fee_emits_event() public {
        vm.expectEmit(false, false, false, true);
        emit ModelNFT.MintFeeUpdated(MINT_FEE, 0.05 ether);
        nft.setMintFee(0.05 ether);
    }

    function test_withdraw_owner_only() public {
        // Deploy a fresh NFT with an EOA owner so it can receive ETH
        address eoaOwner = makeAddr("eoaOwner");
        vm.deal(eoaOwner, 1 ether);

        vm.prank(eoaOwner);
        ModelNFT nft2 = new ModelNFT(MINT_FEE);

        // Mint to put funds in contract
        vm.prank(alice);
        nft2.mintModel{value: MINT_FEE}(
            MODEL_NAME, FRAMEWORK, IPFS_CID, MODEL_HASH, SIZE_BYTES
        );

        // Non-owner reverts
        vm.prank(alice);
        vm.expectRevert();
        nft2.withdraw();

        // Owner succeeds
        uint256 balBefore = eoaOwner.balance;
        vm.prank(eoaOwner);
        nft2.withdraw();
        uint256 balAfter = eoaOwner.balance;
        assertEq(balAfter - balBefore, MINT_FEE);
    }

    function test_withdraw_empty_reverts() public {
        vm.expectRevert("ModelNFT: nothing to withdraw");
        nft.withdraw();
    }

    // -----------------------------------------------------------------------
    //  ERC721 standard behavior
    // -----------------------------------------------------------------------

    function test_transfer_preserves_model_info() public {
        vm.prank(alice);
        nft.mintModel{value: MINT_FEE}(
            MODEL_NAME, FRAMEWORK, IPFS_CID, MODEL_HASH, SIZE_BYTES
        );

        // Transfer from alice to bob
        vm.prank(alice);
        nft.transferFrom(alice, bob, 0);

        assertEq(nft.ownerOf(0), bob);

        // Model info unchanged
        ModelNFT.ModelInfo memory info = nft.getModelInfo(0);
        assertEq(info.name, MODEL_NAME);
        assertEq(info.creator, alice); // Creator stays as original minter
        assertEq(info.ipfsCID, IPFS_CID);
    }

    function test_total_supply_increments() public {
        assertEq(nft.totalSupply(), 0);

        vm.prank(alice);
        nft.mintModel{value: MINT_FEE}("M1", "A", "C1", keccak256("1"), 100);
        assertEq(nft.totalSupply(), 1);

        vm.prank(bob);
        nft.mintModel{value: MINT_FEE}("M2", "B", "C2", keccak256("2"), 200);
        assertEq(nft.totalSupply(), 2);
    }

    function test_token_by_index() public {
        vm.prank(alice);
        nft.mintModel{value: MINT_FEE}("M1", "A", "C1", keccak256("1"), 100);

        vm.prank(bob);
        nft.mintModel{value: MINT_FEE}("M2", "B", "C2", keccak256("2"), 200);

        assertEq(nft.tokenByIndex(0), 0);
        assertEq(nft.tokenByIndex(1), 1);
    }

    // -----------------------------------------------------------------------
    //  Zero-fee minting
    // -----------------------------------------------------------------------

    function test_mint_with_zero_fee() public {
        // Deploy with 0 mint fee
        ModelNFT freeMint = new ModelNFT(0);

        vm.prank(alice);
        uint256 tokenId = freeMint.mintModel(
            MODEL_NAME, FRAMEWORK, IPFS_CID, MODEL_HASH, SIZE_BYTES
        );
        assertEq(tokenId, 0);
    }
}
