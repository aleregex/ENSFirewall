// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IPublicResolver {
    function text(bytes32 node, string calldata key) external view returns (string memory);
}
