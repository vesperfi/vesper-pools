'use strict'

const {expect} = require('chai')
const BN = require('bn.js')
const {ethers} = require('hardhat')
const DECIMAL = new BN('1000000000000000000')
const uniswapAddress = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'
const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'
/**
 * Swap ETH into given token
 *
 * @param {string} ethAmount ETH amount, it is in ETH i.e. 2 for 2 ETH
 * @param {string} toToken Address of output token
 * @param {object} caller caller with signer, who will pay for ETH
 * @param {string} [receiver] Address of token receiver
 * @returns {string} Output amount of token swap
 */
async function swapEthForToken(ethAmount, toToken, caller, receiver) {
  const toAddress = receiver || caller.address
  const amountIn = new BN(ethAmount).mul(DECIMAL).toString()
  const uni = await ethers.getContractAt('IUniswapRouterTest', uniswapAddress)
  const block = await ethers.provider.getBlock()
  const path = [WETH, toToken]
  const token = await ethers.getContractAt('ERC20', toToken)
  await uni.connect(caller.signer).swapExactETHForTokens(1, path, toAddress, block.timestamp + 60, {value: amountIn})
  const tokenBalance = await token.balanceOf(toAddress)
  expect(tokenBalance).to.be.gt('0', 'Token balance is not correct')
  return tokenBalance
}

module.exports = {swapEthForToken}
