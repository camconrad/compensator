import hre from "hardhat";

async function main() {
  // Get factory address from command line argument or use a default
  const factoryAddress = process.argv[2] || "0x0000000000000000000000000000000000000000";
  
  if (factoryAddress === "0x0000000000000000000000000000000000000000") {
    console.log("Please provide a factory address as a command line argument:");
    console.log("npx hardhat run scripts/verify-compensators.ts --network <network> <factory-address>");
    process.exit(1);
  }
  
  console.log(`Verifying Compensator instances for factory at: ${factoryAddress}`);
  
  // @ts-ignore
  const factory = await hre.ethers.getContractAt("CompensatorFactory", factoryAddress);
  const deployedInstances: string[] = await factory.getCompensators();

  console.log(`Found ${deployedInstances.length} deployed Compensator instances`);

  for (const instanceAddress of deployedInstances) {
    console.log(`Verifying Compensator at ${instanceAddress}...`);
    try {
      // @ts-ignore
      await hre.run("verify:verify", {
        address: instanceAddress,
        constructorArguments: []
      });
      console.log(`Successfully verified ${instanceAddress}`);
    } catch (error: any) {
      if (error.message && error.message.includes("Already Verified")) {
        console.log(`Contract at ${instanceAddress} is already verified`);
      } else {
        console.error(`Verification failed for ${instanceAddress}:`, error);
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}); 