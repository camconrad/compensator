// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {DeployCompensatorBaseImpl} from "./DeployCompensatorBaseImpl.s.sol";

contract DeployCompensatorMainnet is DeployCompensatorBaseImpl {
    function run() public returns (DeployedContracts memory) {
        return super.run(true);
    }

    function getDeploymentConfiguration() public view override returns (DeploymentConfiguration memory) {
        return DeploymentConfiguration({
            compToken: 0xc00e94Cb662C3520282E6f5717214004A7f26888,
            compoundGovernor: 0xc0Da02939E1441F497fd74F78cE7Decb17B66529,
            admin: deployer
        });
    }
}
