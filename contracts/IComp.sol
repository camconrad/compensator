// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.30;

interface IComp {
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns(bool);
    function delegate(address delegatee) external;
    function getCurrentVotes(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
}
