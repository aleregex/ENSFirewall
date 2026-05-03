// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {ENSFirewallAccount} from "../src/ENSFirewallAccount.sol";
import {IEntryPoint} from "@account-abstraction/interfaces/IEntryPoint.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract DeployAndSubscribeScript is Script {
    address constant ENTRY_POINT = 0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108; // v0.8 Sepolia

    bytes32 constant SCAMLIST_NODE =
        0xbbddcabcea9c861cd383a22397cc740ec468b664393240f35f21e62b04e5b567;

    function run() external {
        uint256 deployerPk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address publicResolver = vm.envAddress("ENS_PUBLIC_RESOLVER_ADDRESS");
        address deployer = vm.addr(deployerPk);

        console.log("Deployer:", deployer);
        console.log("EntryPoint:", ENTRY_POINT);
        console.log("Authority node:");
        console.logBytes32(SCAMLIST_NODE);
        console.log("Public resolver:", publicResolver);

        vm.startBroadcast(deployerPk);

        // SimpleAccount calls _disableInitializers() in its constructor, so the
        // implementation cannot be initialized directly. Deploy behind ERC1967Proxy
        // and run initializeWithAuthority via the proxy's constructor.
        ENSFirewallAccount impl = new ENSFirewallAccount(IEntryPoint(ENTRY_POINT));
        bytes memory initData = abi.encodeCall(
            ENSFirewallAccount.initializeWithAuthority,
            (deployer, SCAMLIST_NODE, publicResolver)
        );
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), initData);
        ENSFirewallAccount account = ENSFirewallAccount(payable(address(proxy)));

        vm.stopBroadcast();

        console.log("");
        console.log("=========================================");
        console.log("ENSFirewallAccount implementation:");
        console.log(address(impl));
        console.log("ENSFirewallAccount proxy (USE THIS):");
        console.log(address(account));
        console.log("=========================================");
        console.log("");
        console.log("Verify state:");
        console.log("  authorityNode:");
        console.logBytes32(account.authorityNode());
        console.log("  publicResolver:", account.publicResolver());
        console.log("  owner:", account.owner());

        require(account.authorityNode() == SCAMLIST_NODE, "authorityNode mismatch");
        require(account.publicResolver() == publicResolver, "publicResolver mismatch");
        require(account.owner() == deployer, "owner mismatch");

        console.log("");
        console.log("Next steps:");
        console.log("1. Save the proxy address - you'll need it for A9");
        console.log("2. Send some Sepolia ETH to it so it can execute transactions");
        console.log("3. Run A9 to test the policy enforcement end-to-end");
    }
}
