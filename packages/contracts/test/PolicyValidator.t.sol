// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {PolicyValidator} from "../src/PolicyValidator.sol";

contract PolicyValidatorTest is Test {
    function callValidateBlocklist(bytes memory encoded, address target) external pure {
        PolicyValidator.validateBlocklist(encoded, target);
    }

    function test_AllowsTargetNotInBlocklist() public pure {
        address[] memory list = new address[](2);
        list[0] = address(0xBADBAD);
        list[1] = address(0xC0FFEE);
        bytes memory encoded = abi.encode(list);

        // Should not revert
        PolicyValidator.validateBlocklist(encoded, address(0x1234));
    }

    function test_RevertsTargetInBlocklist() public {
        address[] memory list = new address[](1);
        list[0] = address(0xBADBAD);
        bytes memory encoded = abi.encode(list);

        vm.expectRevert(
            abi.encodeWithSelector(
                PolicyValidator.PolicyViolation.selector,
                "destination is on blocklist"
            )
        );
        this.callValidateBlocklist(encoded, address(0xBADBAD));
    }

    function test_HandlesEmptyBlocklist() public pure {
        address[] memory list = new address[](0);
        bytes memory encoded = abi.encode(list);

        // Should not revert with any address
        PolicyValidator.validateBlocklist(encoded, address(0xBADBAD));
    }
}
