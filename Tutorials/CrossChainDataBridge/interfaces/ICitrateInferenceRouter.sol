// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface ICitrateInferenceRouter {
    enum RequestStatus {
        Pending,
        Processing,
        Completed,
        Failed,
        Cancelled
    }

    function requestInference(
        bytes32 modelHash,
        bytes calldata inputData,
        uint256 maxPrice
    ) external payable returns (uint256 requestId);

    function getRequest(uint256 requestId)
        external
        view
        returns (
            address requester,
            bytes32 modelHash,
            RequestStatus status,
            bytes memory outputData,
            uint256 pricePaid
        );
}
