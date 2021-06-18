'use strict'

const {prepareConfig} = require('./config')
const {shouldBehaveLikePool} = require('../behavior/vesper-pool')
const StrategyType = require('../utils/strategyTypes')
const {ethers} = require('hardhat')
const ONE_MILLION = ethers.utils.parseEther('1000000')

describe('vUSDC Pool', function () {
  const interestFee = '1500' // 15%
  const strategies = [
    {
      name: 'YearnStrategyUSDC',
      type: StrategyType.YEARN,
      config: {interestFee, debtRatio: 9000, debtRate: ONE_MILLION},
    }
  ]
  prepareConfig(strategies)
  shouldBehaveLikePool('vUSDC', 'USDC')
})
