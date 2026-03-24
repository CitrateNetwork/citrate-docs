// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface ISourceChainInferenceGateway {
    struct Attestation {
        bytes32 sourceRequestId;
        uint256 citrateRequestId;
        bytes32 modelHash;
        bytes32 inputHash;
        bytes32 outputHash;
        bytes32 citrateBlockHash;
        uint64 citrateBlockNumber;
        uint64 citrateChainId;
    }

    event InferenceRequested(
        bytes32 indexed requestId,
        address indexed requester,
        bytes32 indexed modelHash,
        bytes32 inputHash,
        uint256 maxPrice,
        uint256 deadline,
        address callbackTarget,
        bytes4 callbackSelector
    );

    event InferenceFinalized(
        bytes32 indexed requestId,
        bytes32 outputHash,
        uint256 citrateRequestId
    );

    event InferenceFailed(
        bytes32 indexed requestId,
        uint256 citrateRequestId
    );

    function requestInference(
        bytes32 modelHash,
        bytes calldata inputData,
        uint256 maxPrice,
        uint256 deadline,
        address callbackTarget,
        bytes4 callbackSelector
    ) external returns (bytes32 requestId);

    function finalizeInference(
        bytes32 requestId,
        uint256 citrateRequestId,
        bytes calldata outputData,
        bytes calldata quorumSignatures,
        bytes calldata attestations
    ) external;

    function finalizeInferenceTyped(
        bytes32 requestId,
        uint256 citrateRequestId,
        bytes calldata outputData,
        Attestation[] calldata attestations,
        bytes[] calldata signatures
    ) external;

    function markFailed(
        bytes32 requestId,
        uint256 citrateRequestId,
        bytes calldata quorumSignatures,
        bytes calldata attestations
    ) external;

    function markFailedTyped(
        bytes32 requestId,
        uint256 citrateRequestId,
        Attestation[] calldata attestations,
        bytes[] calldata signatures
    ) external;

    function getRequest(bytes32 requestId)
        external
        view
        returns (
            address requester,
            bytes32 modelHash,
            bytes32 inputHash,
            bytes memory inputData,
            uint256 maxPrice,
            uint256 deadline,
            address callbackTarget,
            bytes4 callbackSelector,
            uint8 status,
            uint256 citrateRequestId,
            bytes32 outputHash,
            bytes memory outputData
        );
}
