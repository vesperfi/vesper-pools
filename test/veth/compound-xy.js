'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const { shouldMigrateStrategies } = require('../behavior/strategy-migration')
const StrategyType = require('../utils/strategyTypes')
const { ethers } = require('hardhat')

const ONE_MILLION = ethers.utils.parseEther('1000000')

describe('vETH Pool with Compound XY Strategy', function () {
  const interestFee = '1500' // 15%
  const strategies = [
    {
      name: 'CompoundXYStrategyETH',
      type: StrategyType.COMPOUND_XY,
      config: { interestFee, debtRatio: 9000, debtRate: ONE_MILLION },
    },
  ]
  prepareConfig(strategies)
  shouldBehaveLikePool('vETH', 'WETH')
  for (let i = 0; i < strategies.length; i++) {
    shouldBehaveLikeStrategy(i, strategies[i].type, strategies[i].name)
  }
  shouldMigrateStrategies('vETH')
})
