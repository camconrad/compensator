import { ethers } from "ethers";
import { getEthersSigner } from "../hooks/useEtherProvider";

/**
 * @title Voting Architecture Demo
 * @notice Demonstrates how the Compensator contract acts as a voting proxy
 * where the owner votes directly through it, storing vote directions
 */
async function main() {
    console.log("🚀 Compensator Voting Architecture Demo");
    console.log("========================================");

    // Get signers
    const [owner, user1, user2] = await ethers.getSigners();
    console.log(`Owner: ${owner.address}`);
    console.log(`User 1: ${user1.address}`);
    console.log(`User 2: ${user2.address}`);

    // Deploy mock contracts for demo
    console.log("\n📋 Step 0: Deploying Mock Contracts");
    console.log("------------------------------------");
    
    // Deploy mock COMP token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockComp = await MockERC20.deploy("Compound", "COMP");
    await mockComp.waitForDeployment();
    console.log(`Mock COMP Token deployed at: ${await mockComp.getAddress()}`);

    // Deploy mock Governor
    const MockGovernor = await ethers.getContractFactory("MockGovernor");
    const mockGovernor = await MockGovernor.deploy();
    await mockGovernor.waitForDeployment();
    console.log(`Mock Governor deployed at: ${await mockGovernor.getAddress()}`);

    // Deploy Compensator
    const Compensator = await ethers.getContractFactory("Compensator");
    const compensator = await Compensator.deploy(
        await mockComp.getAddress(),
        await mockGovernor.getAddress(),
        owner.address
    );
    await compensator.waitForDeployment();
    console.log(`Compensator deployed at: ${await compensator.getAddress()}`);

    // Mint some COMP to the owner and users
    const mintAmount = ethers.parseEther("10000");
    await mockComp.mint(owner.address, mintAmount);
    await mockComp.mint(user1.address, mintAmount);
    await mockComp.mint(user2.address, mintAmount);
    console.log(`Minted ${ethers.formatEther(mintAmount)} COMP to each user`);

    console.log("\n📋 Step 1: Check Contract State");
    console.log("--------------------------------");
    
    // Check contract voting power (should be 0 initially)
    const contractVotingPower = await mockComp.balanceOf(await compensator.getAddress());
    console.log(`Contract Voting Power: ${ethers.formatEther(contractVotingPower)} COMP`);
    
    // Check total votes cast
    const totalVotesCast = await compensator.voteCount();
    console.log(`Total Votes Cast: ${totalVotesCast}`);

    console.log("\n📋 Step 2: Owner Deposits COMP");
    console.log("-------------------------------");
    
    // Owner deposits COMP to fund rewards
    const depositAmount = ethers.parseEther("5000");
    await mockComp.connect(owner).approve(await compensator.getAddress(), depositAmount);
    await compensator.connect(owner).ownerDeposit(depositAmount);
    console.log(`Owner deposited ${ethers.formatEther(depositAmount)} COMP`);

    console.log("\n📋 Step 3: Users Delegate COMP");
    console.log("-------------------------------");
    
    // Users delegate COMP to the contract
    const delegateAmount = ethers.parseEther("1000");
    await mockComp.connect(user1).approve(await compensator.getAddress(), delegateAmount);
    await mockComp.connect(user2).approve(await compensator.getAddress(), delegateAmount);
    
    // Note: In the real contract, users would call userDeposit, but for demo we'll simulate delegation
    console.log(`User 1 delegated ${ethers.formatEther(delegateAmount)} COMP`);
    console.log(`User 2 delegated ${ethers.formatEther(delegateAmount)} COMP`);

    console.log("\n📋 Step 4: Owner Casts Vote on Proposal");
    console.log("----------------------------------------");
    
    // Create a mock proposal in the governor
    const proposalId = 123;
    await mockGovernor.createProposal(proposalId);
    console.log(`Created mock proposal with ID: ${proposalId}`);
    
    // Owner casts vote
    const voteDirection = 1; // 1 = For, 0 = Against
    const voteReason = "This proposal aligns with our community's long-term vision for protocol sustainability";
    
    console.log(`Vote Direction: ${voteDirection === 1 ? 'FOR' : 'AGAINST'}`);
    console.log(`Vote Reason: "${voteReason}"`);
    
    // Cast the vote
    await compensator.connect(owner).castVote(proposalId, voteDirection, voteReason);
    console.log("✅ Vote cast successfully!");

    console.log("\n📋 Step 5: Check Vote Information");
    console.log("----------------------------------");
    
    // Get vote information for the proposal
    const voteInfo = await compensator.voteInfo(proposalId);
    console.log(`Vote Direction: ${voteInfo.direction === 1 ? 'FOR' : 'AGAINST'}`);
    console.log(`Block Number: ${voteInfo.blockNumber}`);
    console.log(`Transaction Hash: ${voteInfo.txHash}`);
    console.log(`Timestamp: ${new Date(Number(voteInfo.timestamp) * 1000).toISOString()}`);
    console.log(`Voting Power Used: ${ethers.formatEther(voteInfo.votingPower)} COMP`);
    console.log(`Vote Reason: "${voteInfo.reason}"`);

    console.log("\n📋 Step 6: Check Delegate Performance");
    console.log("--------------------------------------");
    
    const delegateInfo = await compensator.delegateInfo();
    console.log(`Successful Votes: ${delegateInfo.successfulVotes}`);
    console.log(`Total Votes: ${delegateInfo.totalVotes}`);
    console.log(`Total Rewards Earned: ${ethers.formatEther(delegateInfo.totalRewardsEarned)} COMP`);
    console.log(`Total Voting Power Used: ${ethers.formatEther(delegateInfo.totalVotingPowerUsed)} COMP`);
    console.log(`Average Voting Power per Vote: ${ethers.formatEther(delegateInfo.averageVotingPowerPerVote)} COMP`);

    console.log("\n📋 Step 7: Vote History");
    console.log("------------------------");
    
    const totalVotes = await compensator.voteCount();
    console.log(`Total votes in history: ${totalVotes}`);
    
    // Display recent votes
    for (let i = 0; i < Math.min(Number(totalVotes), 5); i++) {
        const voteIndex = Number(totalVotes) - 1 - i; // Show most recent first
        const vote = await compensator.allVotes(voteIndex);
        console.log(`\nVote ${voteIndex}:`);
        console.log(`  Direction: ${vote.direction === 1 ? 'FOR' : 'AGAINST'}`);
        console.log(`  Block: ${vote.blockNumber}`);
        console.log(`  Voting Power: ${ethers.formatEther(vote.votingPower)} COMP`);
        console.log(`  Reason: "${vote.reason}"`);
    }

    console.log("\n📋 Step 8: Test Staking on Proposals");
    console.log("-------------------------------------");
    
    // Users stake on the proposal
    const stakeAmount = ethers.parseEther("100");
    
    // User 1 stakes FOR
    await mockComp.connect(user1).approve(await compensator.getAddress(), stakeAmount);
    await compensator.connect(user1).stakeForProposal(proposalId, 1, stakeAmount);
    console.log(`User 1 staked ${ethers.formatEther(stakeAmount)} COMP FOR proposal ${proposalId}`);
    
    // User 2 stakes AGAINST
    await mockComp.connect(user2).approve(await compensator.getAddress(), stakeAmount);
    await compensator.connect(user2).stakeForProposal(proposalId, 0, stakeAmount);
    console.log(`User 2 staked ${ethers.formatEther(stakeAmount)} COMP AGAINST proposal ${proposalId}`);
    
    // Check total stakes
    const totalStakesFor = await compensator.totalStakesFor(proposalId);
    const totalStakesAgainst = await compensator.totalStakesAgainst(proposalId);
    console.log(`Total stakes FOR: ${ethers.formatEther(totalStakesFor)} COMP`);
    console.log(`Total stakes AGAINST: ${ethers.formatEther(totalStakesAgainst)} COMP`);

    console.log("\n🎯 Architecture Benefits:");
    console.log("=========================");
    console.log("✅ Owner votes directly through the contract");
    console.log("✅ Contract stores direction of each cast vote");
    console.log("✅ Complete transparency of voting history");
    console.log("✅ Voting power tracking and performance metrics");
    console.log("✅ Optional vote reasoning for accountability");
    console.log("✅ Stake distribution based on vote correctness");
    console.log("✅ Delegators can see how their voting power was used");

    console.log("\n🔍 Key Features:");
    console.log("================");
    console.log("• voteInfo(proposalId) - Get specific vote details");
    console.log("• allVotes(index) - Get vote by chronological index");
    console.log("• voteCount() - Get total number of votes");
    console.log("• delegateInfo() - Get performance metrics");
    console.log("• castVote(proposalId, support, reason) - Cast vote with reason");
    console.log("• stakeForProposal(proposalId, support, amount) - Stake on proposal outcome");

    console.log("\n✨ Demo Complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    }); 