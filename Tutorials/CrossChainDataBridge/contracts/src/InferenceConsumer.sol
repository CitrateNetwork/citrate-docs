// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./SourceChainInferenceGateway.sol";

contract InferenceConsumer {
    SourceChainInferenceGateway public gateway;

    mapping(bytes32 => bytes) private _results;

    event InferenceRequested(bytes32 indexed requestId);
    event InferenceConsumed(bytes32 indexed requestId, bytes outputData);

    constructor(address gatewayAddress) {
        gateway = SourceChainInferenceGateway(gatewayAddress);
    }

    function requestInference(
        bytes32 modelHash,
        bytes calldata inputData,
        uint256 maxPrice,
        uint256 deadline
    ) external returns (bytes32 requestId) {
        requestId = gateway.requestInference(
            modelHash,
            inputData,
            maxPrice,
            deadline,
            address(this),
            this.onInferenceResult.selector
        );

        emit InferenceRequested(requestId);
    }

    function onInferenceResult(bytes32 requestId, bytes calldata outputData) external {
        require(msg.sender == address(gateway), "Only gateway");

        _results[requestId] = outputData;

        emit InferenceConsumed(requestId, outputData);
    }

    function getResult(bytes32 requestId) external view returns (bytes memory) {
        return _results[requestId];
    }
}
