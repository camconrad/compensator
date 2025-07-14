import hre from "hardhat";

async function main() {
  // @ts-ignore
  const CompensatorFactory = await hre.ethers.getContractFactory("CompensatorFactory");
  const compensatorFactory = await CompensatorFactory.deploy();
  await compensatorFactory.deployed();
  const address = compensatorFactory.address;
  console.log("CompensatorFactory deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}); 