// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script, console2} from "forge-std/Script.sol";
import {CompensatorFactory} from "contracts/CompensatorFactory.sol";
import {Compensator} from "contracts/Compensator.sol";

abstract contract DeployCompensatorBaseImpl is Script {
    struct DeploymentConfiguration {
        address compToken;
        address compoundGovernor;
        address admin;
    }

    struct DeployedContracts {
        CompensatorFactory compensatorFactory;
        address exampleCompensator;
    }

    address public deployer;
    uint256 public deployerPrivateKey;
    bool showDeployLogs = false;

    function logDeploy(string memory message, address addr) internal view {
        if (showDeployLogs) {
            console2.log(message, addr);
        }
    }

    function logTx(string memory message) internal view {
        if (showDeployLogs) {
            console2.log(message);
        }
    }

    function logInfo(string memory message, address addr) internal view {
        if (showDeployLogs) {
            console2.log(message, addr);
        }
    }

    function setUp() public virtual {
        deployerPrivateKey =
            vm.envOr("DEPLOYER_PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));
        deployer = vm.addr(deployerPrivateKey);
    }

    function getDeploymentConfiguration() public virtual returns (DeploymentConfiguration memory);

    function run(bool _showDeployLogs) public virtual returns (DeployedContracts memory) {
        showDeployLogs = _showDeployLogs;
        DeploymentConfiguration memory config = getDeploymentConfiguration();

        // Start broadcast
        vm.startBroadcast(deployerPrivateKey);

        // Deploy CompensatorFactory
        CompensatorFactory compensatorFactory = new CompensatorFactory(
            config.compToken,
            config.compoundGovernor
        );
        logDeploy("CompensatorFactory deployed", address(compensatorFactory));

        // Create an example Compensator instance to verify the factory works
        address exampleCompensator = compensatorFactory.createCompensator(config.admin);
        logDeploy("Example Compensator created for admin", exampleCompensator);

        // Log important addresses and information
        logInfo("COMP Token:", config.compToken);
        logInfo("Compound Governor:", config.compoundGovernor);
        logInfo("Admin:", config.admin);

        console2.log("\nIMPORTANT: Deployment configuration values:");
        console2.log("- Factory Address:", address(compensatorFactory));
        console2.log("- COMP Token:", config.compToken);
        console2.log("- Compound Governor:", config.compoundGovernor);
        console2.log("- Example Compensator for Admin:", exampleCompensator);

        vm.stopBroadcast();

        return DeployedContracts({
            compensatorFactory: compensatorFactory,
            exampleCompensator: exampleCompensator
        });
    }
}
