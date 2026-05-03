// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {EntryPoint} from "@account-abstraction/core/EntryPoint.sol";
import {IEntryPoint} from "@account-abstraction/interfaces/IEntryPoint.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {ENSFirewallAccount} from "../src/ENSFirewallAccount.sol";

contract ENSFirewallAccountTest is Test {
    EntryPoint internal entryPoint;
    ENSFirewallAccount internal account;

    address internal constant BLOCKED = address(0xBADBAD);

    function setUp() public {
        entryPoint = new EntryPoint();
        ENSFirewallAccount impl = new ENSFirewallAccount(IEntryPoint(address(entryPoint)));

        address[] memory blocklist = new address[](1);
        blocklist[0] = BLOCKED;

        bytes memory initData = abi.encodeCall(
            ENSFirewallAccount.initializeWithBlocklist,
            (address(this), blocklist)
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), initData);
        account = ENSFirewallAccount(payable(address(proxy)));

        vm.deal(address(account), 10 ether);
    }

    function test_AllowsTransferToSafeAddress() public {
        address allowedRecipient = address(0xA11CE);
        uint256 balanceBefore = allowedRecipient.balance;

        account.execute(allowedRecipient, 1 ether, "");

        assertEq(allowedRecipient.balance, balanceBefore + 1 ether);
    }

    function test_RevertsTransferToBlockedAddress() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                ENSFirewallAccount.PolicyViolation.selector,
                "destination is on blocklist"
            )
        );
        account.execute(BLOCKED, 1 ether, "");
    }

    function test_OwnerCanAddToBlocklist() public {
        address newBad = address(0xC0FFEE);

        assertFalse(account.blockedAddresses(newBad));
        account.blockAddress(newBad);
        assertTrue(account.blockedAddresses(newBad));

        vm.expectRevert(
            abi.encodeWithSelector(
                ENSFirewallAccount.PolicyViolation.selector,
                "destination is on blocklist"
            )
        );
        account.execute(newBad, 1 ether, "");
    }

    function test_OwnerCanUnblock() public {
        assertTrue(account.blockedAddresses(BLOCKED));

        account.unblockAddress(BLOCKED);
        assertFalse(account.blockedAddresses(BLOCKED));

        uint256 balanceBefore = BLOCKED.balance;
        account.execute(BLOCKED, 1 ether, "");
        assertEq(BLOCKED.balance, balanceBefore + 1 ether);
    }
}
