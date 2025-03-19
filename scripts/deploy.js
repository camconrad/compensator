async function deployAndSetup() {
    const CompensatorFactory = await ethers.getContractFactory("CompensatorFactory");
    const factory = await CompensatorFactory.deploy();
    await factory.deployed();
    console.log("CompensatorFactory deployed to:", factory.address);
  
    const delegatee = "0x123...";
    const delegateeName = "Delegate 1";
  
    await factory.createCompensator(delegatee, delegateeName);
    const compensatorAddress = await factory.getCompensator(delegatee);
    console.log("Compensator deployed to:", compensatorAddress);
  
    const Compensator = await ethers.getContractFactory("Compensator");
    const compensator = Compensator.attach(compensatorAddress);
  
    console.log("Setting reward rate...");
    await compensator.setRewardRate(ethers.utils.parseEther("10")); 
    console.log("Reward rate set!");
  }
  
  deployAndSetup()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
