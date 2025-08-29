import hre from "hardhat";
import { ethers } from "ethers";

async function main() {
  // Production addresses for Compound protocol
  const COMP_TOKEN_ADDRESS = "0xc00e94cb662c3520282e6f5717214004a7f26888";
  

  console.log("Deploying CompensatorFactory with production addresses...");
  console.log("COMP Token:", COMP_TOKEN_ADDRESS);

  // Deploy CompensatorFactory with required constructor parameters
  // @ts-expect-error - Types not configured for scripts
  const CompensatorFactory = await hre.ethers.getContractFactory("CompensatorFactory");
  const compensatorFactory = await CompensatorFactory.deploy(
    COMP_TOKEN_ADDRESS
  );
  
  await compensatorFactory.waitForDeployment();
  
  const address = await compensatorFactory.getAddress();
  console.log("✅ CompensatorFactory deployed to:", address);
  console.log("✅ Factory is ready to create Compensator instances");
  
  // Verify the deployment
  console.log("\n🔍 Verifying contract on Etherscan...");
  try {
    await hre.run("verify:verify", {
      address: address,
      constructorArguments: [COMP_TOKEN_ADDRESS],
    });
    console.log("✅ Contract verified on Etherscan");
  } catch (error: any) {
    if (error.message && error.message.includes("Already Verified")) {
      console.log("✅ Contract is already verified");
    } else {
      console.log("⚠️ Verification failed:", error.message);
      console.log("💡 You can manually verify with:");
      console.log(`yarn hardhat verify --network mainnet ${address} ${COMP_TOKEN_ADDRESS}`);
    }
  }

  console.log("\n📋 Deployment Summary:");
  console.log("Factory Address:", address);
  console.log("COMP Token:", COMP_TOKEN_ADDRESS);
  console.log("\n🚀 Ready for production use!");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}); 