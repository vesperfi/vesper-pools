'use strict'

const { expect } = require('chai')
const { ethers } = require('hardhat')
const { BigNumber } = require('ethers')
const { getChain } = require('../utils/chains')
const { UNI2_ROUTER, NATIVE_TOKEN } = require(`../../helper/${getChain()}/address`)

const DECIMAL = BigNumber.from('1000000000000000000')

// Note: The UniswapV2-like DEXes in Avalanche chain change their interfaces renaming `ETH` to `AVAX` on function names
const RouterInterface = getChain() === 'avalanche' ? 'IAvalancheRouterTest' : 'IUniswapRouterTest'
const SwapExactNaveForTokensFunction = getChain() === 'avalanche' ? 'swapExactAVAXForTokens' : 'swapExactETHForTokens'

/**
 * Swap ETH into given token
 *
 * @param {string} ethAmount ETH amount, it is in ETH i.e. 2 for 2 ETH
 * @param {string} toToken Address of output token
 * @param {object} caller caller with signer, who will pay for ETH
 * @param {string} [receiver] Address of token receiver
 * @returns {Promise<BigNumber>} Output amount of token swap
 */
async function swapEthForToken(ethAmount, toToken, caller, receiver) {
  const toAddress = receiver || caller.address
  const amountIn = BigNumber.from(ethAmount).mul(DECIMAL).toString()
  const uni = await ethers.getContractAt(RouterInterface, UNI2_ROUTER)
  const block = await ethers.provider.getBlock()
  const path = [NATIVE_TOKEN, toToken]
  const token = await ethers.getContractAt('ERC20', toToken)
  await uni
    .connect(caller.signer || caller._signer)
    [SwapExactNaveForTokensFunction](1, path, toAddress, block.timestamp + 60, { value: amountIn })
  const tokenBalance = await token.balanceOf(toAddress)
  expect(tokenBalance).to.be.gt('0', 'Token balance is not correct')
  return tokenBalance
}

async function swapExactToken(amountIn, path, caller, receiver) {
  const toAddress = receiver || caller.address
  const tokenIn = await ethers.getContractAt('ERC20', path[0])
  const tokenOut = await ethers.getContractAt('ERC20', path[path.length - 1])
  const uni = await ethers.getContractAt(RouterInterface, UNI2_ROUTER)
  const block = await ethers.provider.getBlock()
  await tokenIn.connect(caller.signer).approve(uni.address, amountIn)
  await uni.connect(caller.signer).swapExactTokensForTokens(amountIn, 1, path, toAddress, block.timestamp + 60)
  const amountOut = await tokenOut.balanceOf(toAddress)
  return amountOut
}

async function getAmountsOut(amountIn, path) {
  const uni = await ethers.getContractAt(RouterInterface, UNI2_ROUTER)
  const amountsOut = await uni.getAmountsOut(amountIn, path)
  return amountsOut[path.length - 1]
}

module.exports = { swapEthForToken, swapExactToken, getAmountsOut }
