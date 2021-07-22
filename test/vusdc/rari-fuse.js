'use strict'

const {prepareConfig} = require('./config')
const {shouldBehaveLikeStrategy} = require('../behavior/strategy')
const StrategyType = require('../utils/strategyTypes')
const {ethers} = require('hardhat')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const ONE_MILLION = ethers.utils.parseEther('1000000')

describe('vUSDC Pool', function () {
  const interestFee = '1500' // 15%
  const strategies = [
    {
      name: 'RariFuseStrategyUSDC',
      type: StrategyType.RARI_FUSE,
      config: {interestFee, debtRatio: 9000, debtRate: ONE_MILLION},
    },
  ]
  prepareConfig(strategies)
  shouldBehaveLikePool('vUsdc','USDC')
  for (let i = 0; i < strategies.length; i++) {
    shouldBehaveLikeStrategy(i, strategies[i].type, strategies[i].name)
  }
})
