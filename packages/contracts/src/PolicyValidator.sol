// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title PolicyValidator
/// @notice Pure validation logic for ENSFirewall policies. Decodes
///         ABI-encoded policy blobs and reverts when a transaction
///         violates a rule.
/// @dev Layer 2 supports blocklist only. Limits and patterns will
///      be added in Layer 4.
library PolicyValidator {
    /// @notice Thrown when a transaction violates a subscribed policy
    /// @param reason Human-readable description of the violation
    error PolicyViolation(string reason);

    /// @notice Thrown when a transaction exceeds a configured spend limit
    /// @param reason Human-readable description of the violation
    error LimitExceeded(string reason);

    /// @notice Validate that `target` is not in the encoded blocklist
    /// @param encoded ABI-encoded address[] from a policy:rules-encoded text record
    /// @param target The destination address of the transaction being validated
    function validateBlocklist(bytes memory encoded, address target) internal pure {
        address[] memory blocked = abi.decode(encoded, (address[]));
        for (uint256 i = 0; i < blocked.length; i++) {
            if (blocked[i] == target) {
                revert PolicyViolation("destination is on blocklist");
            }
        }
    }

    /// @notice Validate that `value` and the running daily total are within limits
    /// @param encoded ABI-encoded (uint256 maxPerTxWei, uint256 maxPerDayWei)
    ///                from a policy:limits-encoded text record
    /// @param value The wei value of the transaction being validated
    /// @param currentDailySpend Wei already spent in the current 24h window
    function validateLimits(
        bytes memory encoded,
        uint256 value,
        uint256 currentDailySpend
    ) internal pure {
        (uint256 maxPerTx, uint256 maxPerDay) = abi.decode(encoded, (uint256, uint256));
        if (value > maxPerTx) {
            revert LimitExceeded("transaction exceeds max per tx");
        }
        if (currentDailySpend + value > maxPerDay) {
            revert LimitExceeded("transaction exceeds daily limit");
        }
    }
}
