// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "citrate-contracts/lib/AccessControl.sol";
import "citrate-contracts/lib/ReentrancyGuard.sol";

/**
 * @title ServicePool
 * @notice Receives revenue share from PROTECTED/DEFENDED tier patents and burned stakes.
 *         Distributes funds: 70% node operators, 20% platform, 10% community grants.
 *         NO litigation reserves — platform never funds legal action.
 */
contract ServicePool is AccessControl, ReentrancyGuard {
    // -----------------------------------------------------------------------
    //  Constants
    // -----------------------------------------------------------------------

    uint256 public constant OPERATOR_BPS = 7000;   // 70%
    uint256 public constant PLATFORM_BPS = 2000;    // 20%
    uint256 public constant COMMUNITY_BPS = 1000;   // 10%
    uint256 public constant BPS_DENOMINATOR = 10000;

    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");

    // -----------------------------------------------------------------------
    //  State
    // -----------------------------------------------------------------------

    address public operatorFund;
    address public platformFund;
    address public communityFund;

    uint256 public totalReceived;
    uint256 public totalDistributed;

    // -----------------------------------------------------------------------
    //  Events
    // -----------------------------------------------------------------------

    event RevenueReceived(address indexed from, uint256 amount);
    event RevenueDistributed(uint256 toOperators, uint256 toPlatform, uint256 toCommunity);
    event FundsUpdated(address operatorFund, address platformFund, address communityFund);

    // -----------------------------------------------------------------------
    //  Constructor
    // -----------------------------------------------------------------------

    constructor(address _operatorFund, address _platformFund, address _communityFund) {
        require(_operatorFund != address(0) && _platformFund != address(0) && _communityFund != address(0),
            "ServicePool: zero address");
        operatorFund = _operatorFund;
        platformFund = _platformFund;
        communityFund = _communityFund;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(DISTRIBUTOR_ROLE, msg.sender);
    }

    // -----------------------------------------------------------------------
    //  Receive
    // -----------------------------------------------------------------------

    /// @notice Accept SALT from tier contracts, burned stakes, etc.
    receive() external payable {
        totalReceived += msg.value;
        emit RevenueReceived(msg.sender, msg.value);
    }

    // -----------------------------------------------------------------------
    //  Distribution
    // -----------------------------------------------------------------------

    /**
     * @notice Distribute the current balance according to the 70/20/10 split.
     */
    function distribute() external onlyRole(DISTRIBUTOR_ROLE) nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "ServicePool: nothing to distribute");

        uint256 toOperators = (balance * OPERATOR_BPS) / BPS_DENOMINATOR;
        uint256 toPlatform = (balance * PLATFORM_BPS) / BPS_DENOMINATOR;
        uint256 toCommunity = balance - toOperators - toPlatform; // remainder avoids rounding dust

        totalDistributed += balance;

        (bool ok1, ) = operatorFund.call{value: toOperators}("");
        require(ok1, "ServicePool: operator transfer failed");

        (bool ok2, ) = platformFund.call{value: toPlatform}("");
        require(ok2, "ServicePool: platform transfer failed");

        (bool ok3, ) = communityFund.call{value: toCommunity}("");
        require(ok3, "ServicePool: community transfer failed");

        emit RevenueDistributed(toOperators, toPlatform, toCommunity);
    }

    // -----------------------------------------------------------------------
    //  Admin
    // -----------------------------------------------------------------------

    function setFunds(
        address _operatorFund,
        address _platformFund,
        address _communityFund
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_operatorFund != address(0) && _platformFund != address(0) && _communityFund != address(0),
            "ServicePool: zero address");
        operatorFund = _operatorFund;
        platformFund = _platformFund;
        communityFund = _communityFund;
        emit FundsUpdated(_operatorFund, _platformFund, _communityFund);
    }

    /// @notice View current pending balance.
    function pendingBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
