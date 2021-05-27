'use strict'
const {prepareConfig} = require('./config')
const {shouldBehaveLikeStrategy} = require('../behavior/strategy')
const StrategyType = require('../utils/strategyTypes')
const {BigNumber: BN} = require('ethers')
const DECIMAL18 = BN.from('1000000000000000000')
const ONE_MILLION = DECIMAL18.mul('1000000')

/* eslint-disable mocha/no-setup-in-describe */
describe('vUSDC with aaveV1 and aave strategies', function () {
  const _interestFee = '1500' // 15%
  const _strategies = [
    {
      name: 'AaveStrategyUSDC',
      type: StrategyType.AAVE,
      config: {_interestFee, debtRatio: 4000, debtRate: ONE_MILLION},
    },
    {
      name: 'AaveV1StrategyUSDC',
      type: StrategyType.AAVE_V1,
      config: {_interestFee, debtRatio: 4000, debtRate: ONE_MILLION},
    },
  ]
  
  const strategies = prepareConfig(_strategies)

  for (let i = 0; i < strategies.length; i++) {
    shouldBehaveLikeStrategy(i, strategies[i].type, strategies[i].name)
  }
})
