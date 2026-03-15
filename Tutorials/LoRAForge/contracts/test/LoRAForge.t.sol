// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "citrate-contracts/ModelRegistry.sol";
import "citrate-contracts/LoRAFactory.sol";
import "citrate-contracts/IPFSIncentives.sol";
import "citrate-contracts/interfaces/IModelRegistry.sol";

contract LoRAForgeTest is Test {
    ModelRegistry registry;
    LoRAFactory factory;
    IPFSIncentives ipfs;

    address deployer = address(this);
    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    bytes32 baseModelHash;

    function setUp() public {
        // Deploy contracts
        registry = new ModelRegistry();
        factory = new LoRAFactory(address(registry));
        ipfs = new IPFSIncentives();

        // Seed base model
        IModelRegistry.ModelMetadata memory meta = IModelRegistry.ModelMetadata({
            description: "Test base model",
            inputShape: new string[](1),
            outputShape: new string[](1),
            parameters: 7_000_000_000,
            license: "Apache-2.0",
            tags: new string[](1)
        });
        meta.inputShape[0] = "text";
        meta.outputShape[0] = "text";
        meta.tags[0] = "language";

        baseModelHash = registry.registerModel{value: 0.1 ether}(
            "test-model",
            "GGUF",
            "1.0.0",
            "QmTestModelCID",
            1_000_000_000,
            0,
            meta
        );

        // Fund IPFSIncentives
        ipfs.depositRewards{value: 100 ether}();

        // Fund test accounts
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
    }

    function testDeployment() public view {
        assertEq(address(factory.modelRegistry()), address(registry));
        assertGt(registry.totalModels(), 0);
    }

    function testBaseModelSeeded() public view {
        (address owner, string memory name,,,,,, bool isActive) = registry.getModel(baseModelHash);
        assertEq(owner, deployer);
        assertEq(name, "test-model");
        assertTrue(isActive);
    }

    function testCreateLoRA() public {
        // Grant alice permission on the base model
        registry.grantPermission(baseModelHash, alice);

        vm.startPrank(alice);

        LoRAFactory.TrainingConfig memory config = LoRAFactory.TrainingConfig({
            epochs: 5,
            batchSize: 32,
            learningRate: 3e14, // 0.0003
            datasetCID: "QmDatasetCID123",
            datasetSize: 1_000_000,
            validationSplit: 1000 // 10%
        });

        uint256 cost = 5 * 0.01 ether; // 5 epochs * 0.01 SALT
        bytes32 loraHash = factory.createLoRA{value: cost}(
            baseModelHash,
            "alice-finetune",
            "Fine-tuned for customer support",
            8,    // rank
            16,   // alpha
            500,  // dropout (5%)
            config
        );

        vm.stopPrank();

        // Verify LoRA was created
        (bytes32 returnedBaseModel, address creator, string memory name,, uint256 rank, bool isPublic) =
            factory.getLoRA(loraHash);
        assertEq(returnedBaseModel, baseModelHash);
        assertEq(creator, alice);
        assertEq(name, "alice-finetune");
        assertEq(rank, 8);
        assertFalse(isPublic);

        // Verify it appears in user's list
        bytes32[] memory aliceLoRAs = factory.getUserLoRAs(alice);
        assertEq(aliceLoRAs.length, 1);
        assertEq(aliceLoRAs[0], loraHash);
    }

    function testCompleteTraining() public {
        registry.grantPermission(baseModelHash, alice);
        vm.prank(alice);

        LoRAFactory.TrainingConfig memory config = LoRAFactory.TrainingConfig({
            epochs: 3,
            batchSize: 16,
            learningRate: 1e14,
            datasetCID: "QmDataset456",
            datasetSize: 500_000,
            validationSplit: 2000
        });

        bytes32 loraHash = factory.createLoRA{value: 0.03 ether}(
            baseModelHash,
            "training-test",
            "Testing training completion",
            4,
            8,
            100,
            config
        );

        // Operator completes training with IPFS CID
        factory.completeTraining(loraHash, "QmTrainedWeightsCID789");

        (,,,string memory ipfsCID,,) = factory.getLoRA(loraHash);
        assertEq(ipfsCID, "QmTrainedWeightsCID789");
    }

    function testSetPublicStatus() public {
        registry.grantPermission(baseModelHash, alice);

        vm.startPrank(alice);

        LoRAFactory.TrainingConfig memory config = LoRAFactory.TrainingConfig({
            epochs: 1,
            batchSize: 8,
            learningRate: 1e14,
            datasetCID: "QmDS",
            datasetSize: 100,
            validationSplit: 1000
        });

        bytes32 loraHash = factory.createLoRA{value: 0.01 ether}(
            baseModelHash,
            "public-test",
            "Testing public toggle",
            4, 8, 100,
            config
        );

        // Initially private
        (,,,,, bool isPublic) = factory.getLoRA(loraHash);
        assertFalse(isPublic);

        // Set public
        factory.setPublicStatus(loraHash, true);
        (,,,,, isPublic) = factory.getLoRA(loraHash);
        assertTrue(isPublic);

        vm.stopPrank();
    }

    function testGrantPermission() public {
        registry.grantPermission(baseModelHash, alice);

        vm.startPrank(alice);

        LoRAFactory.TrainingConfig memory config = LoRAFactory.TrainingConfig({
            epochs: 1, batchSize: 8, learningRate: 1e14,
            datasetCID: "QmDS", datasetSize: 100, validationSplit: 1000
        });

        bytes32 loraHash = factory.createLoRA{value: 0.01 ether}(
            baseModelHash,
            "perm-test",
            "Testing permissions",
            4, 8, 100,
            config
        );

        // Grant bob permission
        factory.grantPermission(loraHash, bob);
        vm.stopPrank();

        assertTrue(factory.adapterPermissions(loraHash, bob));
    }

    function testReportPinningAndClaimRewards() public {
        // Deployer has REPORTER_ROLE from constructor
        uint256 sizePinned = 500_000_000; // 500 MB

        ipfs.reportPinning("QmTrainedWeightsCID789", sizePinned, IPFSIncentives.ModelType.LANGUAGE);

        // Check reward was calculated (LANGUAGE = 2x multiplier, 1 GB rounds up)
        uint256 expectedReward = 1 * 2 * 1 ether; // 1 GB * 2x * 1 SALT/GB = 2 SALT
        assertEq(ipfs.pendingRewards(deployer), expectedReward);

        // Claim rewards
        uint256 balanceBefore = deployer.balance;
        ipfs.claimRewards();
        uint256 balanceAfter = deployer.balance;
        assertEq(balanceAfter - balanceBefore, expectedReward);
        assertEq(ipfs.pendingRewards(deployer), 0);
    }

    function testCalculateReward() public view {
        // 1 GB, LANGUAGE (2x) = 2 SALT
        uint256 reward = ipfs.calculateReward(1_000_000_000, IPFSIncentives.ModelType.LANGUAGE);
        assertEq(reward, 2 ether);

        // 1 GB, MULTIMODAL (4x) = 4 SALT
        reward = ipfs.calculateReward(1_000_000_000, IPFSIncentives.ModelType.MULTIMODAL);
        assertEq(reward, 4 ether);

        // 500 MB rounds up to 1 GB, CUSTOM (1x) = 1 SALT
        reward = ipfs.calculateReward(500_000_000, IPFSIncentives.ModelType.CUSTOM);
        assertEq(reward, 1 ether);
    }

    function testFullFlow() public {
        // End-to-end: register model → create LoRA → complete training → pin → claim
        registry.grantPermission(baseModelHash, alice);

        // Alice creates LoRA
        vm.startPrank(alice);
        LoRAFactory.TrainingConfig memory config = LoRAFactory.TrainingConfig({
            epochs: 10,
            batchSize: 32,
            learningRate: 3e14,
            datasetCID: "QmFullFlowDataset",
            datasetSize: 5_000_000,
            validationSplit: 1500
        });

        bytes32 loraHash = factory.createLoRA{value: 0.1 ether}(
            baseModelHash,
            "full-flow-lora",
            "End-to-end test adapter",
            16, 32, 300,
            config
        );
        vm.stopPrank();

        // Operator completes training
        string memory weightsCID = "QmFullFlowWeights";
        factory.completeTraining(loraHash, weightsCID);

        // Report pinning of the trained weights (deployer has REPORTER_ROLE)
        ipfs.reportPinning(weightsCID, 2_000_000_000, IPFSIncentives.ModelType.LANGUAGE);

        // Verify reward (2 GB * 2x * 1 SALT = 4 SALT)
        assertEq(ipfs.pendingRewards(deployer), 4 ether);

        // Claim
        uint256 balBefore = deployer.balance;
        ipfs.claimRewards();
        assertEq(deployer.balance - balBefore, 4 ether);
    }

    function testCreateLoRAWithoutPermissionReverts() public {
        vm.startPrank(bob);

        LoRAFactory.TrainingConfig memory config = LoRAFactory.TrainingConfig({
            epochs: 1, batchSize: 8, learningRate: 1e14,
            datasetCID: "QmDS", datasetSize: 100, validationSplit: 1000
        });

        vm.expectRevert("No permission for base model");
        factory.createLoRA{value: 0.01 ether}(
            baseModelHash,
            "should-fail",
            "No permission",
            4, 8, 100,
            config
        );

        vm.stopPrank();
    }

    function testInsufficientFeeReverts() public {
        registry.grantPermission(baseModelHash, alice);

        vm.startPrank(alice);

        LoRAFactory.TrainingConfig memory config = LoRAFactory.TrainingConfig({
            epochs: 10, batchSize: 8, learningRate: 1e14,
            datasetCID: "QmDS", datasetSize: 100, validationSplit: 1000
        });

        // 10 epochs * 0.01 = 0.1 SALT, but only sending 0.05
        vm.expectRevert("Insufficient training fee");
        factory.createLoRA{value: 0.05 ether}(
            baseModelHash,
            "underpaid",
            "Should revert",
            4, 8, 100,
            config
        );

        vm.stopPrank();
    }

    // Allow receiving SALT
    receive() external payable {}
}
