async function main() {
  const CompensatorFactory = await ethers.getContractFactory("CompensatorFactory");
  
  const deployTransaction = await CompensatorFactory.deploy();
  
  const compensatorFactory = await deployTransaction.waitForDeployment();
  
  const address = await compensatorFactory.getAddress();
  
  console.log("CompensatorFactory deployed to:", address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });