'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const StrategyType = require('../utils/strategyTypes')
const { ethers } = require('hardhat')

const ONE_MILLION = ethers.utils.parseEther('1000000')

describe('vUNI Pool with Compound Leverage Strategy', function () {
  const interestFee = '1500' // 15%
  const strategies = [
    {
      name: 'CompoundLeverageStrategyUNI',
      type: StrategyType.COMPOUND_LEVERAGE,
      config: { interestFee, debtRatio: 9000, debtRate: ONE_MILLION },
    },
  ]
  prepareConfig(strategies)
  shouldBehaveLikePool('vUNI', 'UNI')
  for (let i = 0; i < strategies.length; i++) {
    shouldBehaveLikeStrategy(i, strategies[i].type, strategies[i].name)
  }
})
