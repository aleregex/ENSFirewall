// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {SimpleAccount} from "@account-abstraction/accounts/SimpleAccount.sol";
import {IEntryPoint} from "@account-abstraction/interfaces/IEntryPoint.sol";
import {Exec} from "@account-abstraction/utils/Exec.sol";
import {PolicyValidator} from "./PolicyValidator.sol";
import {IPublicResolver} from "./interfaces/IPublicResolver.sol";

/// @title ENSFirewallAccount
/// @notice ERC-4337 smart account that reads its blocklist policy from
///         an ENS text record at execution time. The smart account is
///         subscribed to a single authority (Layer 2 simplification);
///         multi-authority subscriptions land in Layer 4.
contract ENSFirewallAccount is SimpleAccount {
    bytes32 public authorityNode;
    address public publicResolver;

    string private constant POLICY_KEY = "policy:rules-encoded";

    event AuthoritySet(bytes32 indexed node);
    event PolicyResolverSet(address indexed resolver);

    constructor(IEntryPoint anEntryPoint) SimpleAccount(anEntryPoint) {}

    function initializeWithAuthority(
        address anOwner,
        bytes32 _authorityNode,
        address _publicResolver
    ) public virtual initializer {
        _initialize(anOwner);
        authorityNode = _authorityNode;
        publicResolver = _publicResolver;
        emit AuthoritySet(_authorityNode);
        emit PolicyResolverSet(_publicResolver);
    }

    function setAuthority(bytes32 newNode) external {
        _requireForExecute();
        authorityNode = newNode;
        emit AuthoritySet(newNode);
    }

    function setPublicResolver(address newResolver) external {
        _requireForExecute();
        publicResolver = newResolver;
        emit PolicyResolverSet(newResolver);
    }

    function _validateAgainstPolicy(address target) internal view {
        string memory hexEncoded = IPublicResolver(publicResolver).text(authorityNode, POLICY_KEY);
        if (bytes(hexEncoded).length == 0) {
            return;
        }
        bytes memory encoded = _hexStringToBytes(hexEncoded);
        PolicyValidator.validateBlocklist(encoded, target);
    }

    function execute(address target, uint256 value, bytes calldata data) external override {
        _requireForExecute();
        _validateAgainstPolicy(target);
        bool ok = Exec.call(target, value, data, gasleft());
        if (!ok) {
            Exec.revertWithReturnData();
        }
    }

    function executeBatch(Call[] calldata calls) external override {
        _requireForExecute();
        uint256 callsLength = calls.length;
        for (uint256 i = 0; i < callsLength; i++) {
            Call calldata c = calls[i];
            _validateAgainstPolicy(c.target);
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

    function _hexStringToBytes(string memory hexStr) internal pure returns (bytes memory) {
        bytes memory s = bytes(hexStr);
        uint256 start = 0;
        if (s.length >= 2 && s[0] == "0" && (s[1] == "x" || s[1] == "X")) {
            start = 2;
        }
        require((s.length - start) % 2 == 0, "invalid hex length");
        bytes memory result = new bytes((s.length - start) / 2);
        for (uint256 i = 0; i < result.length; i++) {
            result[i] = bytes1(
                _hexCharToByte(s[start + i * 2]) * 16 +
                _hexCharToByte(s[start + i * 2 + 1])
            );
        }
        return result;
    }

    function _hexCharToByte(bytes1 c) internal pure returns (uint8) {
        if (uint8(c) >= 48 && uint8(c) <= 57) return uint8(c) - 48;       // 0-9
        if (uint8(c) >= 97 && uint8(c) <= 102) return uint8(c) - 97 + 10; // a-f
        if (uint8(c) >= 65 && uint8(c) <= 70) return uint8(c) - 65 + 10;  // A-F
        revert("invalid hex char");
    }
}
