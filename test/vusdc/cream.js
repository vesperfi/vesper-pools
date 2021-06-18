'use strict'

const {prepareConfig} = require('./config')
const {shouldBehaveLikeStrategy} = require('../behavior/strategy')
const StrategyType = require('../utils/strategyTypes')
const {ethers} = require('hardhat')
const ONE_MILLION = ethers.utils.parseEther('1000000')

describe('vUSDC Pool', function () {
  const interestFee = '1500' // 15%
  const strategies = [
    {
      name: 'CreamStrategyUSDC',
      type: StrategyType.CREAM,
      config: {interestFee, debtRatio: 9000, debtRate: ONE_MILLION},
    },
  ]
  prepareConfig(strategies)
  shouldBehaveLikeStrategy(0, strategies[0].type, strategies[0].name)
})
