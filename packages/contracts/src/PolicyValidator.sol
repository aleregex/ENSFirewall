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
}
