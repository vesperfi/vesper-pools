'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const StrategyType = require('../utils/strategyTypes')
const { ethers } = require('hardhat')

const ONE_MILLION = ethers.utils.parseEther('1000000')

describe('vETH Pool with Compound Strategy', function () {
  const interestFee = '1500' // 15%
  const strategies = [
    {
      name: 'CompoundStrategyETH',
      type: StrategyType.COMPOUND,
      config: { interestFee, debtRatio: 9000, debtRate: ONE_MILLION },
    },
  ]
  prepareConfig(strategies)
  for (let i = 0; i < strategies.length; i++) {
    shouldBehaveLikeStrategy(i, strategies[i].type, strategies[i].name)
  }
})
