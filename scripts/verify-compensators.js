const hre = require("hardhat");

async function main() {
  const factoryAddress = "0xE76632FF20e31ac970CEBA307375C5A4f89a32fC";
  const factory = await ethers.getContractAt("CompensatorFactory", factoryAddress);
  
  // Get all deployed compensator instances
  const deployedInstances = await factory.getCompensators();
  
  console.log(`Found ${deployedInstances.length} deployed Compensator instances`);
  
  // Verify each instance
  for (const instanceAddress of deployedInstances) {
    console.log(`Verifying Compensator at ${instanceAddress}...`);
    
    try {
      // Since these are full contract deployments (not proxies/clones),
      // we can use the standard verification process
      await hre.run("verify:verify", {
        address: instanceAddress,
        // No constructor arguments needed since initialization is done through initialize()
        constructorArguments: []
      });
      
      console.log(`Successfully verified ${instanceAddress}`);
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log(`Contract at ${instanceAddress} is already verified`);
      } else {
        console.error(`Verification failed for ${instanceAddress}:`, error);
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });