import { ethers } from 'ethers';
import { 
    COMPENSATOR_FACTORY_ADDRESS,
    COMPENSATOR_ABI, 
    COMPENSATOR_FACTORY_ABI,
    ERC20_ABI 
} from '../config/constants'; 

// Methods for executing transactions on Ethereum 

export const getProvider = () => {
    if (typeof window !== 'undefined' && typeof window.ethereum !== 'undefined') {
        return new ethers.BrowserProvider(window.ethereum);
    }
    throw new Error('Ethereum provider not found.');
};

export const getSigner = async (provider: ethers.BrowserProvider) => {
    return await provider.getSigner();
};

export const approve = async (depositToken: string, compensatorAddress: string) => {
    const provider = getProvider();
    const signer = await getSigner(provider);
    const contract = new ethers.Contract(
        depositToken,
        ERC20_ABI, // Ensure ERC20_ABI is a valid ABI array
        signer
    );

    // No max approval
    const maxApprovalAmount = ethers.MaxUint256;
    const approvalTx = await contract.approve(compensatorAddress, maxApprovalAmount);
    await approvalTx.wait();
};

export const delegateDeposit = async (amount: bigint, compensatorAddress: string) => {
    const provider = getProvider();
    const signer = await getSigner(provider);
    const contract = new ethers.Contract(
        compensatorAddress,
        COMPENSATOR_ABI, // Ensure COMPENSATOR_ABI is a valid ABI array
        signer
    );

    const depositTx = await contract.delegateDeposit(amount);
    await depositTx.wait();
};

export const delegateWithdraw = async (amount: bigint, compensatorAddress: string) => {
    const provider = getProvider();
    const signer = await getSigner(provider);
    const contract = new ethers.Contract(
        compensatorAddress,
        COMPENSATOR_ABI, // Ensure COMPENSATOR_ABI is a valid ABI array
        signer
    );

    const withdrawTx = await contract.delegateWithdraw(amount);
    await withdrawTx.wait();
};

export const setRewardRate = async (newRate: bigint, compensatorAddress: string) => {
    const provider = getProvider();
    const signer = await getSigner(provider);
    const contract = new ethers.Contract(
        compensatorAddress,
        COMPENSATOR_ABI, // Ensure COMPENSATOR_ABI is a valid ABI array
        signer
    );

    const setRewardRateTx = await contract.setRewardRate(newRate);
    await setRewardRateTx.wait();
};

export const delegatorDeposit = async (amount: bigint, compensatorAddress: string) => {
    const provider = getProvider();
    const signer = await getSigner(provider);
    const contract = new ethers.Contract(
        compensatorAddress,
        COMPENSATOR_ABI, // Ensure COMPENSATOR_ABI is a valid ABI array
        signer
    );

    const depositTx = await contract.delegatorDeposit(amount);
    await depositTx.wait();
};

export const delegatorWithdraw = async (amount: bigint, compensatorAddress: string) => {
    const provider = getProvider();
    const signer = await getSigner(provider);
    const contract = new ethers.Contract(
        compensatorAddress,
        COMPENSATOR_ABI, // Ensure COMPENSATOR_ABI is a valid ABI array
        signer
    );

    const withdrawTx = await contract.delegatorWithdraw(amount);
    await withdrawTx.wait();
};

export const claimRewards = async (compensatorAddress: string) => {
    const provider = getProvider();
    const signer = await getSigner(provider);
    const contract = new ethers.Contract(
        compensatorAddress,
        COMPENSATOR_ABI, // Ensure COMPENSATOR_ABI is a valid ABI array
        signer
    );

    const claimRewardsTx = await contract.claimRewards();
    await claimRewardsTx.wait();
};

export const getPendingRewards = async (delegator: string, compensatorAddress: string) => {
    const provider = getProvider();
    const contract = new ethers.Contract(
        compensatorAddress,
        COMPENSATOR_ABI, // Ensure COMPENSATOR_ABI is a valid ABI array
        provider
    );

    const pendingRewards = await contract.getPendingRewards(delegator);
    return pendingRewards;
};

export const createCompensator = async (delegate: string, delegateName: string) => {
    const provider = getProvider();
    const signer = await getSigner(provider);
    const contract = new ethers.Contract(
        COMPENSATOR_FACTORY_ADDRESS,
        COMPENSATOR_FACTORY_ABI, // Ensure COMPENSATOR_FACTORY_ABI is a valid ABI array
        signer
    );

    const createCompensatorTx = await contract.createCompensator(delegate, delegateName);
    await createCompensatorTx.wait();
};

export const getCompensatorAddress = async (delegate: string) => {
    const provider = getProvider();
    const contract = new ethers.Contract(
        COMPENSATOR_FACTORY_ADDRESS,
        COMPENSATOR_FACTORY_ABI, // Ensure COMPENSATOR_FACTORY_ABI is a valid ABI array
        provider
    );

    const compensatorAddress = await contract.getCompensatorAddress(delegate);
    return compensatorAddress;
};

export const getCompensatorInfo = async (compensatorAddress: string) => {
    const provider = getProvider();
    const contract = new ethers.Contract(
        compensatorAddress,
        COMPENSATOR_ABI, // Ensure COMPENSATOR_ABI is a valid ABI array
        provider
    );

    const info = await contract.getCompensatorInfo();
    return info;
};

export const getDelegatorInfo = async (delegator: string, compensatorAddress: string) => {
    const provider = getProvider();
    const contract = new ethers.Contract(
        compensatorAddress,
        COMPENSATOR_ABI, // Ensure COMPENSATOR_ABI is a valid ABI array
        provider
    );

    const info = await contract.getDelegatorInfo(delegator);
    return info;
};

export const getTotalSupply = async (compensatorAddress: string) => {
    const provider = getProvider();
    const contract = new ethers.Contract(
        compensatorAddress,
        COMPENSATOR_ABI, // Ensure COMPENSATOR_ABI is a valid ABI array
        provider
    );

    const totalSupply = await contract.totalSupply();
    return totalSupply;
};

export const getTotalRewards = async (compensatorAddress: string) => {
    const provider = getProvider();
    const contract = new ethers.Contract(
        compensatorAddress,
        COMPENSATOR_ABI, // Ensure COMPENSATOR_ABI is a valid ABI array
        provider
    );

    const totalRewards = await contract.totalRewards();
    return totalRewards;
};

export const getRewardRate = async (compensatorAddress: string) => {
    const provider = getProvider();
    const contract = new ethers.Contract(
        compensatorAddress,
        COMPENSATOR_ABI, // Ensure COMPENSATOR_ABI is a valid ABI array
        provider
    );

    const rewardRate = await contract.rewardRate();
    return rewardRate;
};

export const getDelegatorBalance = async (delegator: string, compensatorAddress: string) => {
    const provider = getProvider();
    const contract = new ethers.Contract(
        compensatorAddress,
        COMPENSATOR_ABI, // Ensure COMPENSATOR_ABI is a valid ABI array
        provider
    );

    const balance = await contract.getDelegatorBalance(delegator);
    return balance;
};

export const getDelegatorRewards = async (delegator: string, compensatorAddress: string) => {
    const provider = getProvider();
    const contract = new ethers.Contract(
        compensatorAddress,
        COMPENSATOR_ABI, // Ensure COMPENSATOR_ABI is a valid ABI array
        provider
    );

    const rewards = await contract.getDelegatorRewards(delegator);
    return rewards;
};