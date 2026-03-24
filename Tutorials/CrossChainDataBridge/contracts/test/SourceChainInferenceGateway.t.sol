// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Test.sol";
import "../src/SourceChainInferenceGateway.sol";
import "../src/InferenceConsumer.sol";

contract SourceChainInferenceGatewayTest is Test {
    SourceChainInferenceGateway private gateway;
    InferenceConsumer private consumer;

    uint256 private relayerKey1 = 0xA11CE;
    uint256 private relayerKey2 = 0xB0B;
    address private relayer1;
    address private relayer2;

    function setUp() public {
        relayer1 = vm.addr(relayerKey1);
        relayer2 = vm.addr(relayerKey2);

        gateway = new SourceChainInferenceGateway(40204, 2);
        gateway.setRelayer(relayer1, true);
        gateway.setRelayer(relayer2, true);

        consumer = new InferenceConsumer(address(gateway));
    }

    function testFinalizeInferenceWithQuorum() public {
        bytes32 modelHash = keccak256("model");
        bytes memory inputData = abi.encodePacked("hello");
        uint256 deadline = block.timestamp + 100;

        bytes32 requestId = consumer.requestInference(
            modelHash,
            inputData,
            1 ether,
            deadline
        );

        bytes memory outputData = abi.encodePacked("world");
        bytes32 outputHash = keccak256(outputData);

        SourceChainInferenceGateway.Attestation memory a =
            _buildAttestation(requestId, modelHash, inputData, outputHash);

        bytes[] memory signatures = new bytes[](2);
        SourceChainInferenceGateway.Attestation[] memory attestations =
            new SourceChainInferenceGateway.Attestation[](2);

        attestations[0] = a;
        attestations[1] = a;

        signatures[0] = _signAttestation(relayerKey1, a);
        signatures[1] = _signAttestation(relayerKey2, a);

        gateway.finalizeInferenceTyped(requestId, a.citrateRequestId, outputData, attestations, signatures);

        (, , , , , , , , SourceChainInferenceGateway.RequestStatus status, , bytes32 storedHash, bytes memory storedOutput) =
            gateway.getRequest(requestId);

        assertEq(uint256(status), uint256(SourceChainInferenceGateway.RequestStatus.Completed));
        assertEq(storedHash, outputHash);
        assertEq(storedOutput, outputData);

        bytes memory consumerOutput = consumer.getResult(requestId);
        assertEq(consumerOutput, outputData);
    }

    function testRejectUnauthorizedRelayer() public {
        bytes32 modelHash = keccak256("model");
        bytes memory inputData = abi.encodePacked("hello");
        uint256 deadline = block.timestamp + 100;

        bytes32 requestId = consumer.requestInference(
            modelHash,
            inputData,
            1 ether,
            deadline
        );

        bytes memory outputData = abi.encodePacked("world");
        bytes32 outputHash = keccak256(outputData);

        SourceChainInferenceGateway.Attestation memory a =
            _buildAttestation(requestId, modelHash, inputData, outputHash);

        bytes[] memory signatures = new bytes[](2);
        SourceChainInferenceGateway.Attestation[] memory attestations =
            new SourceChainInferenceGateway.Attestation[](2);

        attestations[0] = a;
        attestations[1] = a;

        signatures[0] = _signAttestation(relayerKey1, a);
        signatures[1] = _signAttestation(0xC0FFEE, a);

        vm.expectRevert(bytes("Unauthorized relayer"));
        gateway.finalizeInferenceTyped(requestId, a.citrateRequestId, outputData, attestations, signatures);
    }

    function _buildAttestation(
        bytes32 requestId,
        bytes32 modelHash,
        bytes memory inputData,
        bytes32 outputHash
    ) internal pure returns (SourceChainInferenceGateway.Attestation memory) {
        return SourceChainInferenceGateway.Attestation({
            sourceRequestId: requestId,
            citrateRequestId: 42,
            modelHash: modelHash,
            inputHash: keccak256(inputData),
            outputHash: outputHash,
            citrateBlockHash: bytes32(uint256(0x1234)),
            citrateBlockNumber: 100,
            citrateChainId: 40204
        });
    }

    function _signAttestation(uint256 key, SourceChainInferenceGateway.Attestation memory a)
        internal
        view
        returns (bytes memory)
    {
        bytes32 digest = _digest(a);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, digest);
        return abi.encodePacked(r, s, v);
    }

    function _digest(SourceChainInferenceGateway.Attestation memory a) internal view returns (bytes32) {
        bytes32 domainSeparator = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256(bytes("CitrateCrossChainInference")),
                keccak256(bytes("1")),
                block.chainid,
                address(gateway)
            )
        );

        bytes32 structHash = keccak256(
            abi.encode(
                gateway.ATTESTATION_TYPEHASH(),
                a.sourceRequestId,
                a.citrateRequestId,
                a.modelHash,
                a.inputHash,
                a.outputHash,
                a.citrateBlockHash,
                a.citrateBlockNumber,
                a.citrateChainId
            )
        );

        return keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
    }
}
