'use strict'
const {getUsers} = require('./setupHelper')
const swapper = require('./tokenSwapper')
const hre = require('hardhat')
const ethers = hre.ethers

/**
 * Deposit in Aave
 *
 * @param {number} amount - amount to be deposited in ETH
 * @param {string} tokenAddress - ERC20 Token address
 * @param {string } receiverAddress - receiver address
 */
async function depositTokenToAave(amount, tokenAddress, receiverAddress) {
  const aaveLendingPool = await ethers.getContractAt('AaveLendingPool', '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9')
  const users = await getUsers()
  const user = users[11] // reserved user11 for deposit
  // swap 10 Ether to DAI
  const _amount = await swapper.swapEthForToken(amount, tokenAddress, user)
  // deposit DAI balance in aave lending pool to get some aDAI
  const token = await ethers.getContractAt('ERC20', tokenAddress)
  await token.connect(user.signer).approve(aaveLendingPool.address, _amount)
  await aaveLendingPool.connect(user.signer).deposit(tokenAddress, _amount, receiverAddress, 0)
}

/**
 * Deposit in Compound
 *
 * @param {number} amount - amount to be deposited in ETH
 * @param {string} tokenAddress - ERC20 Token address
 * @param {string } receiverAddress - receiver address
 */
async function depositTokenToCompound(amount, tokenAddress, receiverAddress) {
  const cToken = await ethers.getContractAt('CToken', '0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643')
  const users = await getUsers()
  const user = users[11] // reserved user11 for deposit
  const _amount = await swapper.swapEthForToken(amount, tokenAddress, user)
  const token = await ethers.getContractAt('ERC20', tokenAddress)
  await token.connect(user.signer).approve(cToken.address, _amount)
  await cToken.connect(user.signer)['mint(uint256)'](_amount)
  const cTokenAmount = await cToken.balanceOf(user.address)
  await cToken.connect(user.signer).transfer(receiverAddress, cTokenAmount)
}

module.exports = {depositTokenToAave, depositTokenToCompound}
