'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const { setupEarnDrip } = require('../utils/setupHelper')
const StrategyType = require('../utils/strategyTypes')
const { ethers } = require('hardhat')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')

describe('veETH pool strategies', function () {
  const interestFee = '2500' // 15%
  const ONE_MILLION = ethers.utils.parseEther('1000000')
  const strategies = [
    {
      name: 'EarnAaveStrategyWETH',
      type: StrategyType.EARN_AAVE,
      config: { interestFee, debtRatio: 9000, debtRate: ONE_MILLION },
    },
  ]
  prepareConfig(strategies)
  setupEarnDrip()

  describe('Pool Tests', function () {
    shouldBehaveLikePool('veETH', 'ETH', true)
  })

  for (let i = 0; i < strategies.length; i++) {
    shouldBehaveLikeStrategy(i, strategies[i].type, strategies[i].name)
  }
})
