'use strict'
const { ethers } = require('hardhat')

function calculateAPY(pricePerShare, blockElapsed) {
  // APY calculation
  const ETHER = ethers.utils.parseEther('1')
  const ONE_YEAR = 60 * 60 * 24 * 365
  const APY = pricePerShare
    .sub(ETHER)
    .mul(ONE_YEAR)
    .mul(100)
    .div(blockElapsed * 14)
  const apyInBasisPoints = APY.mul(100).div(ETHER).toNumber()
  return apyInBasisPoints / 100
}

module.exports = { calculateAPY }
