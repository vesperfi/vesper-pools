'use strict'

const {prepareConfig} = require('./config')
const {shouldBehaveLikeStrategy} = require('../behavior/strategy')
const {setupEarnDrip} = require('../utils/setupHelper')
const StrategyType = require('../utils/strategyTypes')
const {ethers} = require('hardhat')

describe('veETH pool strategies', function () {

  const interestFee = '2500' // 15%
  const ONE_MILLION = ethers.utils.parseEther('1000000')
  const strategies = [
    {
      name: 'EarnRariFuseStrategyETH',
      type: StrategyType.EARN_RARI_FUSE,
      fusePoolId: 23, // Vesper Lend
      config: {interestFee, debtRatio: 9000, debtRate: ONE_MILLION},
    },
  ]
  prepareConfig(strategies)
  setupEarnDrip()
  for (let i = 0; i < strategies.length; i++) {
    shouldBehaveLikeStrategy(i, strategies[i].type, strategies[i].name)
  }
})
