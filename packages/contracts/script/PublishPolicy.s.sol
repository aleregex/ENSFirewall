// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";

interface IENSRegistry {
    function setSubnodeRecord(
        bytes32 node,
        bytes32 label,
        address owner,
        address resolver,
        uint64 ttl
    ) external;
    function owner(bytes32 node) external view returns (address);
    function resolver(bytes32 node) external view returns (address);
}

interface IPublicResolver {
    function setText(bytes32 node, string calldata key, string calldata value) external;
    function text(bytes32 node, string calldata key) external view returns (string memory);
}

contract PublishPolicyScript is Script {
    string constant SUBNAME_LABEL = "scamlist";
    string constant POLICY_KEY_ENCODED = "policy:rules-encoded";
    string constant POLICY_KEY_JSON = "policy:rules";

    function run() external {
        uint256 deployerPk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address registryAddr = vm.envAddress("ENS_REGISTRY_ADDRESS");
        address resolverAddr = vm.envAddress("ENS_PUBLIC_RESOLVER_ADDRESS");
        bytes32 parentNode = vm.envBytes32("ENS_ROOT_NODE");

        address deployer = vm.addr(deployerPk);
        console.log("Deployer:", deployer);
        console.log("Parent node:");
        console.logBytes32(parentNode);

        IENSRegistry registry = IENSRegistry(registryAddr);
        address parentOwner = registry.owner(parentNode);
        require(parentOwner == deployer, "deployer does not own parent ENS");

        bytes32 labelHash = keccak256(bytes(SUBNAME_LABEL));
        bytes32 subnode = keccak256(abi.encodePacked(parentNode, labelHash));
        console.log("Subnode (scamlist.ensfirewall.eth):");
        console.logBytes32(subnode);

        address[] memory blocked = new address[](2);
        blocked[0] = 0xBaD0000000000000000000000000000000000001;
        blocked[1] = 0xbad0000000000000000000000000000000000002;
        bytes memory encoded = abi.encode(blocked);
        string memory encodedHex = vm.toString(encoded);
        console.log("Encoded policy hex:", encodedHex);

        string memory jsonRules = '{"name":"Test Scamlist","version":"1.0.0","type":"blocklist","authority":"scamlist.ensfirewall.eth"}';

        vm.startBroadcast(deployerPk);

        registry.setSubnodeRecord(parentNode, labelHash, deployer, resolverAddr, 0);

        IPublicResolver(resolverAddr).setText(subnode, POLICY_KEY_ENCODED, encodedHex);

        IPublicResolver(resolverAddr).setText(subnode, POLICY_KEY_JSON, jsonRules);

        vm.stopBroadcast();

        console.log("Published policy to scamlist.ensfirewall.eth");
        console.log("View on ENS:", string(abi.encodePacked("https://sepolia.app.ens.domains/scamlist.ensfirewall.eth")));
    }
}
