// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

interface IERC20 {
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

interface IERC1363 is IERC20, IERC165 {
    function transferAndCall(address to, uint256 value) external returns (bool);
    function transferAndCall(address to, uint256 value, bytes calldata data) external returns (bool);
    function transferFromAndCall(address from, address to, uint256 value) external returns (bool);
    function transferFromAndCall(address from, address to, uint256 value, bytes calldata data) external returns (bool);
    function approveAndCall(address spender, uint256 value) external returns (bool);
    function approveAndCall(address spender, uint256 value, bytes calldata data) external returns (bool);
}

interface IERC20Metadata is IERC20 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
}

interface IERC20Errors {
    error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed);
    error ERC20InvalidSender(address sender);
    error ERC20InvalidReceiver(address receiver);
    error ERC20InsufficientAllowance(address spender, uint256 allowance, uint256 needed);
    error ERC20InvalidApprover(address approver);
    error ERC20InvalidSpender(address spender);
}

abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes calldata) {
        return msg.data;
    }

    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 0;
    }
}

abstract contract ERC20 is Context, IERC20, IERC20Metadata, IERC20Errors {
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    uint256 private _totalSupply;
    string private _name;
    string private _symbol;

    constructor(string memory name_, string memory symbol_) {
        _name = name_;
        _symbol = symbol_;
    }

    function name() public view virtual returns (string memory) {
        return _name;
    }

    function symbol() public view virtual returns (string memory) {
        return _symbol;
    }

    function decimals() public view virtual returns (uint8) {
        return 18;
    }

    function totalSupply() public view virtual returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view virtual returns (uint256) {
        return _balances[account];
    }

    function transfer(address to, uint256 value) public virtual returns (bool) {
        address owner = _msgSender();
        _transfer(owner, to, value);
        return true;
    }

    function allowance(address owner, address spender) public view virtual returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 value) public virtual returns (bool) {
        address owner = _msgSender();
        _approve(owner, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) public virtual returns (bool) {
        address spender = _msgSender();
        _spendAllowance(from, spender, value);
        _transfer(from, to, value);
        return true;
    }

    function _transfer(address from, address to, uint256 value) internal {
        if (from == address(0)) revert ERC20InvalidSender(address(0));
        if (to == address(0)) revert ERC20InvalidReceiver(address(0));
        _update(from, to, value);
    }

    function _update(address from, address to, uint256 value) internal virtual {
        if (from == address(0)) {
            _totalSupply += value;
        } else {
            uint256 fromBalance = _balances[from];
            if (fromBalance < value) revert ERC20InsufficientBalance(from, fromBalance, value);
            unchecked {
                _balances[from] = fromBalance - value;
            }
        }

        if (to == address(0)) {
            unchecked {
                _totalSupply -= value;
            }
        } else {
            unchecked {
                _balances[to] += value;
            }
        }

        emit Transfer(from, to, value);
    }

    function _mint(address account, uint256 value) internal {
        if (account == address(0)) revert ERC20InvalidReceiver(address(0));
        _update(address(0), account, value);
    }

    function _burn(address account, uint256 value) internal {
        if (account == address(0)) revert ERC20InvalidSender(address(0));
        _update(account, address(0), value);
    }

    function _approve(address owner, address spender, uint256 value) internal {
        _approve(owner, spender, value, true);
    }

    function _approve(address owner, address spender, uint256 value, bool emitEvent) internal virtual {
        if (owner == address(0)) revert ERC20InvalidApprover(address(0));
        if (spender == address(0)) revert ERC20InvalidSpender(address(0));
        _allowances[owner][spender] = value;
        if (emitEvent) emit Approval(owner, spender, value);
    }

    function _spendAllowance(address owner, address spender, uint256 value) internal virtual {
        uint256 currentAllowance = allowance(owner, spender);
        if (currentAllowance < type(uint256).max) {
            if (currentAllowance < value) revert ERC20InsufficientAllowance(spender, currentAllowance, value);
            unchecked {
                _approve(owner, spender, currentAllowance - value, false);
            }
        }
    }
}

library SafeERC20 {
    error SafeERC20FailedOperation(address token);
    error SafeERC20FailedDecreaseAllowance(address spender, uint256 currentAllowance, uint256 requestedDecrease);

    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeCall(token.transfer, (to, value)));
    }

    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeCall(token.transferFrom, (from, to, value)));
    }

    function _callOptionalReturn(IERC20 token, bytes memory data) private {
        uint256 returnSize;
        uint256 returnValue;
        assembly {
            let success := call(gas(), token, 0, add(data, 0x20), mload(data), 0, 0x20)
            if iszero(success) {
                let ptr := mload(0x40)
                returndatacopy(ptr, 0, returndatasize())
                revert(ptr, returndatasize())
            }
            returnSize := returndatasize()
            returnValue := mload(0)
        }

        if (returnSize == 0 ? address(token).code.length == 0 : returnValue != 1) {
            revert SafeERC20FailedOperation(address(token));
        }
    }
}

abstract contract Initializable {
    struct InitializableStorage {
        uint64 _initialized;
        bool _initializing;
    }

    bytes32 private constant INITIALIZABLE_STORAGE = 0xf0c57e16840df040f15088dc2f81fe391c3923bec73e23a9662efc9c229c6a00;

    error InvalidInitialization();
    error NotInitializing();

    event Initialized(uint64 version);

    modifier initializer() {
        InitializableStorage storage $ = _getInitializableStorage();
        bool isTopLevelCall = !$._initializing;
        uint64 initialized = $._initialized;

        bool initialSetup = initialized == 0 && isTopLevelCall;
        bool construction = initialized == 1 && address(this).code.length == 0;

        if (!initialSetup && !construction) revert InvalidInitialization();
        $._initialized = 1;
        if (isTopLevelCall) $._initializing = true;
        _;
        if (isTopLevelCall) {
            $._initializing = false;
            emit Initialized(1);
        }
    }

    function _getInitializableStorage() private pure returns (InitializableStorage storage $) {
        bytes32 slot = INITIALIZABLE_STORAGE;
        assembly {
            $.slot := slot
        }
    }
}

interface IComp {
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function delegate(address delegatee) external;
    function getCurrentVotes(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
}

interface IGovernorBravo {
    function castVote(uint256 proposalId, uint8 support) external;
}

contract Compensator is ERC20, Initializable {
    using SafeERC20 for IComp;

    IComp public constant compToken = IComp(0xc00e94Cb662C3520282E6f5717214004A7f26888);
    IGovernorBravo public constant governorBravo = IGovernorBravo(0x309a862bbC1A00e45506cB8A802D1ff10004c8C0);

    address public delegate;
    string public delegateName;
    uint256 public availableRewards;
    uint256 public rewardRate;
    uint256 public rewardIndex;
    uint256 public lastRewarded;
    uint256 public totalDelegatedCOMP;
    uint256 public constant DELEGATION_CAP_PERCENT = 5;
    uint256 public delegationCap;
    uint256 public totalPendingRewards;

    mapping(address => uint256) public startRewardIndex;
    mapping(uint256 => mapping(address => uint256)) public proposalStakes;
    mapping(uint256 => uint256) public totalStakesFor;
    mapping(uint256 => uint256) public totalStakesAgainst;

    event DelegateDeposit(address indexed delegate, uint256 amount);
    event DelegateWithdraw(address indexed delegate, uint256 amount);
    event RewardRateUpdate(address indexed delegate, uint256 newRate);
    event DelegatorDeposit(address indexed delegator, uint256 amount);
    event DelegatorWithdraw(address indexed delegator, uint256 amount);
    event ClaimRewards(address indexed delegator, uint256 amount);
    event ProposalStaked(address indexed staker, uint256 proposalId, uint8 support, uint256 amount);
    event ProposalStakeDistributed(uint256 proposalId, uint8 winningSupport);

    modifier onlyDelegate() {
        require(msg.sender == delegate, "Not the delegate");
        _;
    }

    constructor() ERC20("Compensator", "COMPENSATOR") {}

    function initialize(address _delegate, string memory _delegateName) public initializer {
        require(_delegate != address(0), "Invalid delegate address");
        delegate = _delegate;
        delegateName = _delegateName;
        rewardIndex = 1e18;
        compToken.delegate(delegate);
        delegationCap = (compToken.totalSupply() * DELEGATION_CAP_PERCENT) / 100;
    }

    function rewardsUntil() external view returns (uint256) {
        if (rewardRate == 0) return block.timestamp;
        uint256 remainingRewardsTime = availableRewards / rewardRate;
        return lastRewarded + remainingRewardsTime;
    }

    function getPendingRewards(address delegator) external view returns (uint256) {
        uint256 currIndex = _getCurrentRewardsIndex();
        return balanceOf(delegator) * (currIndex - startRewardIndex[delegator]) / 1e18;
    }

    function delegateDeposit(uint256 amount) external onlyDelegate {
        require(amount > 0, "Amount must be greater than 0");
        compToken.transferFrom(delegate, address(this), amount);
        availableRewards += amount;
        _updateRewardsIndex();
        emit DelegateDeposit(delegate, amount);
    }

    function delegateWithdraw(uint256 amount) external onlyDelegate {
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= availableRewards - totalPendingRewards, "Amount exceeds available rewards");
        availableRewards -= amount;
        compToken.transfer(delegate, amount);
        emit DelegateWithdraw(delegate, amount);
    }

    function setRewardRate(uint256 newRate) external onlyDelegate {
        require(newRate >= 0, "Reward rate must be non-negative");
        _updateRewardsIndex();
        rewardRate = newRate;
        emit RewardRateUpdate(delegate, newRate);
    }

    function delegatorDeposit(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(totalDelegatedCOMP + amount <= delegationCap, "Delegation cap exceeded");
        _updateRewardsIndex();
        compToken.transferFrom(msg.sender, address(this), amount);
        startRewardIndex[msg.sender] = rewardIndex;
        _mint(msg.sender, amount);
        totalDelegatedCOMP += amount;
        emit DelegatorDeposit(msg.sender, amount);
    }

    function delegatorWithdraw(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        _claimRewards(msg.sender);
        _burn(msg.sender, amount);
        compToken.transfer(msg.sender, amount);
        totalDelegatedCOMP -= amount;
        emit DelegatorWithdraw(msg.sender, amount);
    }

    function claimRewards() external {
        _claimRewards(msg.sender);
    }

    function stakeForProposal(uint256 proposalId, uint8 support, uint256 amount) external {
        require(support == 0 || support == 1, "Invalid support value");
        require(amount > 0, "Amount must be greater than 0");
        compToken.transferFrom(msg.sender, address(this), amount);
        if (support == 1) {
            proposalStakes[proposalId][msg.sender].forStake += amount;
            totalStakesFor[proposalId] += amount;
        } else {
            proposalStakes[proposalId][msg.sender].againstStake += amount;
            totalStakesAgainst[proposalId] += amount;
        }
        emit ProposalStaked(msg.sender, proposalId, support, amount);
    }

    function distributeStakes(uint256 proposalId, uint8 winningSupport) external onlyDelegate {
        require(winningSupport == 0 || winningSupport == 1, "Invalid support value");
        if (winningSupport == 1) {
            compToken.transfer(delegate, totalStakesFor[proposalId]);
            compToken.transfer(address(this), totalStakesAgainst[proposalId]);
        } else {
            compToken.transfer(delegate, totalStakesAgainst[proposalId]);
            compToken.transfer(address(this), totalStakesFor[proposalId]);
        }
        emit ProposalStakeDistributed(proposalId, winningSupport);
    }

    function _claimRewards(address delegator) internal {
        _updateRewardsIndex();
        uint256 pendingRewards = balanceOf(delegator) * (rewardIndex - startRewardIndex[delegator]) / 1e18;
        startRewardIndex[delegator] = rewardIndex;
        compToken.transfer(delegator, pendingRewards);
        emit ClaimRewards(delegator, pendingRewards);
    }

    function _updateRewardsIndex() internal {
        uint256 timeDelta = block.timestamp - lastRewarded;
        uint256 rewards = timeDelta * rewardRate;
        if (rewards > availableRewards) {
            rewards = availableRewards;
            availableRewards = 0;
        } else {
            availableRewards -= rewards;
        }
        uint256 supply = totalSupply();
        if (supply > 0) {
            rewardIndex += rewards * 1e18 / supply;
            totalPendingRewards += rewards;
        }
        lastRewarded = block.timestamp;
    }

    function _getCurrentRewardsIndex() internal view returns (uint256) {
        uint256 timeDelta = block.timestamp - lastRewarded;
        uint256 rewards = timeDelta * rewardRate;
        uint256 supply = totalSupply();
        if (supply > 0) {
            return rewardIndex + rewards * 1e18 / supply;
        } else {
            return rewardIndex;
        }
    }

    function transfer(address to, uint256 amount) public override returns (bool) {
        revert("Transfers are disabled");
    }

    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        revert("Transfers are disabled");
    }
}

contract CompensatorFactory {
    address[] public compensators;
    mapping(address => address) public delegateeToCompensator;

    function createCompensator(address delegatee, string memory delegateeName) external returns (address) {
        Compensator compensator = new Compensator();
        compensator.initialize(delegatee, delegateeName);
        compensators.push(address(compensator));
        delegateeToCompensator[delegatee] = address(compensator);
        return address(compensator);
    }

    function getCompensator(address delegatee) external view returns (address) {
        return delegateeToCompensator[delegatee];
    }

    function getCompensators() public view returns (address[] memory) {
        return compensators;
    }
}