// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {SimpleAccount} from "@account-abstraction/accounts/SimpleAccount.sol";
import {IEntryPoint} from "@account-abstraction/interfaces/IEntryPoint.sol";
import {Exec} from "@account-abstraction/utils/Exec.sol";

/// @title ENSFirewallAccount
/// @notice ERC-4337 smart account that enforces a hardcoded blocklist
///         before signing any transaction. Layer 1 MVP: no ENS yet,
///         just proving that policy enforcement works at the wallet level.
/// @dev Inherits SimpleAccount and adds a blockedAddresses mapping.
///      In Layer 2, the blocklist will be replaced by an ENS text record
///      read from the agent's subscribed authorities.
contract ENSFirewallAccount is SimpleAccount {
    error PolicyViolation(string reason);

    mapping(address => bool) public blockedAddresses;

    event AddressBlocked(address indexed target);
    event AddressUnblocked(address indexed target);

    constructor(IEntryPoint anEntryPoint) SimpleAccount(anEntryPoint) {}

    /// @notice Initialize the account with an owner and an initial blocklist
    /// @dev Replaces SimpleAccount.initialize() to also seed the blocklist
    function initializeWithBlocklist(
        address anOwner,
        address[] calldata _blockedAddresses
    ) public virtual initializer {
        _initialize(anOwner);
        for (uint256 i = 0; i < _blockedAddresses.length; i++) {
            blockedAddresses[_blockedAddresses[i]] = true;
            emit AddressBlocked(_blockedAddresses[i]);
        }
    }

    /// @notice Add an address to the blocklist (only owner or EntryPoint)
    function blockAddress(address target) external {
        _requireForExecute();
        blockedAddresses[target] = true;
        emit AddressBlocked(target);
    }

    /// @notice Remove an address from the blocklist (only owner or EntryPoint)
    function unblockAddress(address target) external {
        _requireForExecute();
        blockedAddresses[target] = false;
        emit AddressUnblocked(target);
    }

    /// @notice Execute a transaction, reverting if dest is on the blocklist
    function execute(
        address target,
        uint256 value,
        bytes calldata data
    ) external virtual override {
        _requireForExecute();
        if (blockedAddresses[target]) {
            revert PolicyViolation("destination is on blocklist");
        }
        bool ok = Exec.call(target, value, data, gasleft());
        if (!ok) {
            Exec.revertWithReturnData();
        }
    }

    /// @notice Batch execute, checking each destination against the blocklist
    function executeBatch(Call[] calldata calls) external virtual override {
        _requireForExecute();
        uint256 callsLength = calls.length;
        for (uint256 i = 0; i < callsLength; i++) {
            Call calldata c = calls[i];
            if (blockedAddresses[c.target]) {
                revert PolicyViolation("destination is on blocklist");
            }
            bool ok = Exec.call(c.target, c.value, c.data, gasleft());
            if (!ok) {
                if (callsLength == 1) {
                    Exec.revertWithReturnData();
                } else {
                    revert ExecuteError(i, Exec.getReturnData(0));
                }
            }
        }
    }
}
