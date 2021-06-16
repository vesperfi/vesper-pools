'use strict'

const {ethers} = require('hardhat')
const {prepareConfig} = require('./config')
const {shouldBehaveLikePool} = require('../behavior/vesper-pool')
const StrategyType = require('../utils/strategyTypes')

/* eslint-disable mocha/no-setup-in-describe */
describe('vDAI Pool', function () {
  const interestFee = '1500' // 15%
  const strategies = [
    {
      name: 'YearnStrategyDAI',
      type: StrategyType.YEARN,
      config: {interestFee, debtRatio: 9000, debtRate: ethers.utils.parseEther('1000000')},
    },
  ]

  prepareConfig(strategies)
  shouldBehaveLikePool('vDai', 'DAI')
})
