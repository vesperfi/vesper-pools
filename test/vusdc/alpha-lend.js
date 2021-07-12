'use strict'

const {ethers} = require('hardhat')
const {prepareConfig} = require('./config')
const {shouldBehaveLikePool} = require('../behavior/vesper-pool')
const {shouldBehaveLikeStrategy} = require('../behavior/strategy')
const StrategyType = require('../utils/strategyTypes')

describe('vUSDC Pool', function () {
  const interestFee = '1500' // 15%
  const strategies = [
    {
      name: 'AlphaLendStrategyUSDC',
      type: StrategyType.ALPHA_LEND,
      config: {interestFee, debtRatio: 9000, debtRate: ethers.utils.parseEther('1000000')},
    },
  ]

  prepareConfig(strategies)
  shouldBehaveLikePool('vUSDC', 'USDC')
  shouldBehaveLikeStrategy(0, strategies[0].type, strategies[0].name)
})
