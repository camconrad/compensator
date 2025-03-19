const hre = require("hardhat");

async function main() {
  const factoryAddress = "0xE76632FF20e31ac970CEBA307375C5A4f89a32fC";
  const factory = await ethers.getContractAt("CompensatorFactory", factoryAddress);
  
  const deployedInstances = await factory.getCompensators();
  
  console.log(`Found ${deployedInstances.length} deployed Compensator instances`);
  
  for (const instanceAddress of deployedInstances) {
    console.log(`Verifying Compensator at ${instanceAddress}...`);
    
    try {
      await hre.run("verify:verify", {
        address: instanceAddress,
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