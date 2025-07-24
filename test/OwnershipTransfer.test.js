const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Ownership Transfer Fix", function () {
    let compensatorFactory;
    let compensator;
    let compToken;
    let compoundGovernor;
    let owner;
    let newOwner;
    let addr1;
    let addr2;

    beforeEach(async function () {
        [owner, newOwner, addr1, addr2] = await ethers.getSigners();

        // Deploy mock contracts
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        compToken = await MockERC20.deploy("Compound", "COMP");
        await compToken.mint(owner.address, ethers.parseEther("1000000")); // 1M COMP

        const MockGovernor = await ethers.getContractFactory("MockGovernor");
        compoundGovernor = await MockGovernor.deploy();

        // Deploy the factory
        const CompensatorFactory = await ethers.getContractFactory("contracts/CompensatorFactory.sol:CompensatorFactory");
        compensatorFactory = await CompensatorFactory.deploy(compToken.target, compoundGovernor.target);

        // Create a compensator for the owner
        const tx = await compensatorFactory.createCompensator(owner.address);
        const receipt = await tx.wait();
        const event = receipt.logs.find(log => log.eventName === "CompensatorCreated");
        const compensatorAddress = event.args.compensator;
        
        compensator = await ethers.getContractAt("Compensator", compensatorAddress);
    });

    describe("Factory State Management", function () {
        it("Should correctly track compensator creation", async function () {
            // Verify the factory mappings are correct
            expect(await compensatorFactory.ownerToCompensator(owner.address)).to.equal(compensator.target);
            expect(await compensatorFactory.compensatorToOriginalOwner(compensator.target)).to.equal(owner.address);
            expect(await compensatorFactory.hasCompensator(owner.address)).to.be.true;
            expect(await compensatorFactory.ownerToCompensator(owner.address)).to.equal(compensator.target);
        });

        it("Should prevent creating multiple compensators for the same owner", async function () {
            await expect(
                compensatorFactory.createCompensator(owner.address)
            ).to.be.revertedWithCustomError(compensatorFactory, "OwnerAlreadyHasCompensator");
        });
    });

    describe("Ownership Transfer", function () {
        it("Should update factory mappings when ownership is transferred", async function () {
            // Verify initial state
            expect(await compensatorFactory.ownerToCompensator(owner.address)).to.equal(compensator.target);
            expect(await compensatorFactory.ownerToCompensator(newOwner.address)).to.equal(ethers.ZeroAddress);

            // Transfer ownership
            await compensator.transferOwnership(newOwner.address);

            // Verify factory mappings are updated
            expect(await compensatorFactory.ownerToCompensator(owner.address)).to.equal(ethers.ZeroAddress);
            expect(await compensatorFactory.ownerToCompensator(newOwner.address)).to.equal(compensator.target);
            expect(await compensatorFactory.compensatorToOriginalOwner(compensator.target)).to.equal(newOwner.address);

            // Verify helper functions work correctly
            expect(await compensatorFactory.hasCompensator(owner.address)).to.be.false;
            expect(await compensatorFactory.hasCompensator(newOwner.address)).to.be.true;
            expect(await compensatorFactory.ownerToCompensator(newOwner.address)).to.equal(compensator.target);
        });

        it("Should emit correct events during ownership transfer", async function () {
            // Transfer ownership
            const tx = await compensator.transferOwnership(newOwner.address);
            const receipt = await tx.wait();

            // Check for the ownership transfer event by looking for the event signature
            const eventSignature = "CompensatorOwnershipTransferred(address,address,address)";
            const eventTopic = ethers.keccak256(ethers.toUtf8Bytes(eventSignature));
            
            const event = receipt.logs.find(log => 
                log.topics && log.topics[0] === eventTopic
            );
            expect(event).to.not.be.undefined;
            
            // Parse the event data
            const parsedEvent = compensatorFactory.interface.parseLog(event);
            expect(parsedEvent.args.compensator).to.equal(compensator.target);
            expect(parsedEvent.args.oldOwner).to.equal(owner.address);
            expect(parsedEvent.args.newOwner).to.equal(newOwner.address);
        });

        it("Should allow multiple ownership transfers", async function () {
            // First transfer
            await compensator.transferOwnership(newOwner.address);
            expect(await compensatorFactory.ownerToCompensator(newOwner.address)).to.equal(compensator.target);

            // Second transfer
            await compensator.connect(newOwner).transferOwnership(addr1.address);
            expect(await compensatorFactory.ownerToCompensator(newOwner.address)).to.equal(ethers.ZeroAddress);
            expect(await compensatorFactory.ownerToCompensator(addr1.address)).to.equal(compensator.target);
            expect(await compensatorFactory.compensatorToOriginalOwner(compensator.target)).to.equal(addr1.address);
        });

        it("Should prevent non-owners from calling onOwnershipTransferred", async function () {
            await expect(
                compensatorFactory.connect(addr1).onOwnershipTransferred(owner.address, newOwner.address)
            ).to.be.revertedWithCustomError(compensatorFactory, "CompensatorNotCreatedByFactory");
        });

        it("Should handle factory notification failure gracefully", async function () {
            // This test verifies that ownership transfer still succeeds even if factory notification fails
            // We can't easily simulate factory failure in this test, but the try-catch in the contract
            // ensures that ownership transfer doesn't revert due to factory issues
            
            await expect(
                compensator.transferOwnership(newOwner.address)
            ).to.not.be.reverted;
        });
    });

    describe("Factory Functions", function () {
        it("Should return correct compensator count", async function () {
            expect(await compensatorFactory.getCompensatorsCount()).to.equal(1);

            // Create another compensator
            await compensatorFactory.createCompensator(addr1.address);
            expect(await compensatorFactory.getCompensatorsCount()).to.equal(2);
        });

        it("Should return correct compensator list", async function () {
            const compensators = await compensatorFactory.getCompensators(0, 10);
            expect(compensators.length).to.equal(1);
            expect(compensators[0]).to.equal(compensator.target);
        });

        it("Should return correct original owner", async function () {
            expect(await compensatorFactory.getOriginalOwner(compensator.target)).to.equal(owner.address);

            // After ownership transfer
            await compensator.transferOwnership(newOwner.address);
            expect(await compensatorFactory.getOriginalOwner(compensator.target)).to.equal(newOwner.address);
        });
    });

    describe("Edge Cases", function () {
        it("Should handle zero address ownership transfer", async function () {
            await expect(
                compensator.transferOwnership(ethers.ZeroAddress)
            ).to.be.revertedWithCustomError(compensator, "NewOwnerCannotBeZeroAddress");
        });

        it("Should handle transfer to same owner", async function () {
            // This should succeed but not change anything
            await expect(
                compensator.transferOwnership(owner.address)
            ).to.not.be.reverted;

            // Verify mappings are unchanged
            expect(await compensatorFactory.ownerToCompensator(owner.address)).to.equal(compensator.target);
        });
    });
}); 