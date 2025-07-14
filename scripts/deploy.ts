import hre from "hardhat";

async function main() {
  // Production addresses for Compound protocol
  const COMP_TOKEN_ADDRESS = "0xc00e94cb662c3520282e6f5717214004a7f26888";
  const COMPOUND_GOVERNOR_ADDRESS = "0x309a862bbC1A00e45506cB8A802D1ff10004c8C0";

  console.log("Deploying CompensatorFactory with production addresses...");
  console.log("COMP Token:", COMP_TOKEN_ADDRESS);
  console.log("Compound Governor:", COMPOUND_GOVERNOR_ADDRESS);

  // Deploy CompensatorFactory with required constructor parameters
  // @ts-ignore
  const CompensatorFactory = await hre.ethers.getContractFactory("CompensatorFactory");
  const compensatorFactory = await CompensatorFactory.deploy(
    COMP_TOKEN_ADDRESS,
    COMPOUND_GOVERNOR_ADDRESS
  );
  
  await compensatorFactory.deployed();
  
  console.log("✅ CompensatorFactory deployed to:", compensatorFactory.address);
  console.log("✅ Factory is ready to create Compensator instances");
  
  // Verify the deployment
  console.log("\n🔍 Verifying contract on Etherscan...");
  try {
    await hre.run("verify:verify", {
      address: compensatorFactory.address,
      constructorArguments: [COMP_TOKEN_ADDRESS, COMPOUND_GOVERNOR_ADDRESS],
    });
    console.log("✅ Contract verified on Etherscan");
  } catch (error: any) {
    if (error.message && error.message.includes("Already Verified")) {
      console.log("✅ Contract is already verified");
    } else {
      console.log("⚠️ Verification failed:", error.message);
      console.log("💡 You can manually verify with:");
      console.log(`yarn hardhat verify --network mainnet ${compensatorFactory.address} ${COMP_TOKEN_ADDRESS} ${COMPOUND_GOVERNOR_ADDRESS}`);
    }
  }

  console.log("\n📋 Deployment Summary:");
  console.log("Factory Address:", compensatorFactory.address);
  console.log("COMP Token:", COMP_TOKEN_ADDRESS);
  console.log("Compound Governor:", COMPOUND_GOVERNOR_ADDRESS);
  console.log("\n🚀 Ready for production use!");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}); 