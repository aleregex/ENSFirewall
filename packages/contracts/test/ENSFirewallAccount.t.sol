// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, Vm} from "forge-std/Test.sol";
import {EntryPoint} from "@account-abstraction/core/EntryPoint.sol";
import {IEntryPoint} from "@account-abstraction/interfaces/IEntryPoint.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {ENSFirewallAccount} from "../src/ENSFirewallAccount.sol";
import {PolicyValidator} from "../src/PolicyValidator.sol";

contract MockPublicResolver {
    mapping(bytes32 => mapping(string => string)) private _records;

    function text(bytes32 node, string calldata key) external view returns (string memory) {
        return _records[node][key];
    }

    function setText(bytes32 node, string calldata key, string calldata value) external {
        _records[node][key] = value;
    }
}

contract ENSFirewallAccountTest is Test {
    EntryPoint internal entryPoint;
    ENSFirewallAccount internal account;
    MockPublicResolver internal resolver;

    bytes32 internal constant AUTHORITY_NODE = keccak256("authority.test");
    string internal constant POLICY_KEY = "policy:rules-encoded";
    string internal constant LIMITS_KEY = "policy:limits-encoded";

    address internal constant BLOCKED = address(0xBADBAD);
    address internal constant ALICE = address(0xA11CE);

    function setUp() public {
        entryPoint = new EntryPoint();
        resolver = new MockPublicResolver();

        ENSFirewallAccount impl = new ENSFirewallAccount(IEntryPoint(address(entryPoint)));

        bytes memory initData = abi.encodeCall(
            ENSFirewallAccount.initializeWithAuthority,
            (address(this), AUTHORITY_NODE, address(resolver))
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), initData);
        account = ENSFirewallAccount(payable(address(proxy)));

        vm.deal(address(account), 100 ether);
    }

    function _setBlocklist(address[] memory addrs) internal {
        string memory hexStr = vm.toString(abi.encode(addrs));
        resolver.setText(AUTHORITY_NODE, POLICY_KEY, hexStr);
    }

    function _setBlocklistOn(bytes32 node, address[] memory addrs) internal {
        string memory hexStr = vm.toString(abi.encode(addrs));
        resolver.setText(node, POLICY_KEY, hexStr);
    }

    function _setLimits(uint256 maxPerTx, uint256 maxPerDay) internal {
        string memory hexStr = vm.toString(abi.encode(maxPerTx, maxPerDay));
        resolver.setText(AUTHORITY_NODE, LIMITS_KEY, hexStr);
    }

    function test_AllowsTransferToSafeAddress() public {
        address[] memory list = new address[](1);
        list[0] = BLOCKED;
        _setBlocklist(list);

        uint256 balanceBefore = ALICE.balance;
        account.execute(ALICE, 1 ether, "");
        assertEq(ALICE.balance, balanceBefore + 1 ether);
    }

    function test_RevertsTransferToBlockedAddress() public {
        address[] memory list = new address[](1);
        list[0] = BLOCKED;
        _setBlocklist(list);

        vm.expectRevert(
            abi.encodeWithSelector(
                PolicyValidator.PolicyViolation.selector,
                "destination is on blocklist"
            )
        );
        account.execute(BLOCKED, 1 ether, "");
    }

    function test_PolicyChangeAffectsBehaviorWithoutRedeploy() public {
        // Block X
        address[] memory list = new address[](1);
        list[0] = BLOCKED;
        _setBlocklist(list);

        vm.expectRevert(
            abi.encodeWithSelector(
                PolicyValidator.PolicyViolation.selector,
                "destination is on blocklist"
            )
        );
        account.execute(BLOCKED, 1 ether, "");

        // Update authority's policy: blocklist no longer contains X
        address[] memory newList = new address[](1);
        newList[0] = address(0xDEAD);
        _setBlocklist(newList);

        uint256 balanceBefore = BLOCKED.balance;
        account.execute(BLOCKED, 1 ether, "");
        assertEq(BLOCKED.balance, balanceBefore + 1 ether);
    }

    function test_AllowsWhenNoPolicySet() public {
        // resolver returns empty string by default (never setText'd)
        uint256 balanceBefore = BLOCKED.balance;
        account.execute(BLOCKED, 1 ether, "");
        assertEq(BLOCKED.balance, balanceBefore + 1 ether);
    }

    function test_OwnerCanChangeAuthority() public {
        // Initial authority blocks BLOCKED
        address[] memory list = new address[](1);
        list[0] = BLOCKED;
        _setBlocklist(list);

        vm.expectRevert(
            abi.encodeWithSelector(
                PolicyValidator.PolicyViolation.selector,
                "destination is on blocklist"
            )
        );
        account.execute(BLOCKED, 1 ether, "");

        // Switch to a new authority whose policy does NOT block BLOCKED
        bytes32 newAuthority = keccak256("authority2.test");
        address[] memory newList = new address[](1);
        newList[0] = address(0xDEAD);
        _setBlocklistOn(newAuthority, newList);

        account.setAuthority(newAuthority);
        assertEq(account.authorityNode(), newAuthority);

        uint256 balanceBefore = BLOCKED.balance;
        account.execute(BLOCKED, 1 ether, "");
        assertEq(BLOCKED.balance, balanceBefore + 1 ether);
    }

    // --- Limits ---

    function test_LimitsAllowsTxBelowMaxPerTx() public {
        _setLimits(1 ether, 100 ether);

        uint256 balanceBefore = ALICE.balance;
        account.execute(ALICE, 0.5 ether, "");
        assertEq(ALICE.balance, balanceBefore + 0.5 ether);
        assertEq(account.spentToday(), 0.5 ether);
    }

    function test_LimitsRevertsTxAboveMaxPerTx() public {
        _setLimits(1 ether, 100 ether);

        vm.expectRevert(
            abi.encodeWithSelector(
                PolicyValidator.LimitExceeded.selector,
                "transaction exceeds max per tx"
            )
        );
        account.execute(ALICE, 2 ether, "");
    }

    function test_LimitsTracksDailySpend() public {
        _setLimits(5 ether, 10 ether);

        account.execute(ALICE, 4 ether, "");
        assertEq(account.spentToday(), 4 ether);

        account.execute(ALICE, 4 ether, "");
        assertEq(account.spentToday(), 8 ether);

        vm.expectRevert(
            abi.encodeWithSelector(
                PolicyValidator.LimitExceeded.selector,
                "transaction exceeds daily limit"
            )
        );
        account.execute(ALICE, 4 ether, "");
    }

    function test_LimitsResetsAfterOneDay() public {
        _setLimits(2 ether, 1 ether);

        account.execute(ALICE, 1 ether, "");
        assertEq(account.spentToday(), 1 ether);

        vm.expectRevert(
            abi.encodeWithSelector(
                PolicyValidator.LimitExceeded.selector,
                "transaction exceeds daily limit"
            )
        );
        account.execute(ALICE, 0.1 ether, "");

        vm.warp(block.timestamp + 1 days + 1);

        account.execute(ALICE, 0.5 ether, "");
        assertEq(account.spentToday(), 0.5 ether);
    }

    function test_LimitsAndBlocklistCoexist() public {
        address[] memory blocklist = new address[](1);
        blocklist[0] = BLOCKED;
        _setBlocklist(blocklist);
        _setLimits(1 ether, 5 ether);

        // Blocklist hit takes precedence
        vm.expectRevert(
            abi.encodeWithSelector(
                PolicyValidator.PolicyViolation.selector,
                "destination is on blocklist"
            )
        );
        account.execute(BLOCKED, 0.5 ether, "");

        // Over the per-tx limit even though target is safe
        vm.expectRevert(
            abi.encodeWithSelector(
                PolicyValidator.LimitExceeded.selector,
                "transaction exceeds max per tx"
            )
        );
        account.execute(ALICE, 2 ether, "");

        // Within both rules: passes
        uint256 balanceBefore = ALICE.balance;
        account.execute(ALICE, 0.5 ether, "");
        assertEq(ALICE.balance, balanceBefore + 0.5 ether);
        assertEq(account.spentToday(), 0.5 ether);
    }
}
