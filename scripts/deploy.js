async function main() {
  // Get the contract factory
  const CompensatorFactory = await ethers.getContractFactory("CompensatorFactory");
  
  // Deploy the contract
  const deployTransaction = await CompensatorFactory.deploy();
  
  // Wait for deployment to be mined
  const compensatorFactory = await deployTransaction.waitForDeployment();
  
  // Get the deployed address
  const address = await compensatorFactory.getAddress();
  
  console.log("CompensatorFactory deployed to:", address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });