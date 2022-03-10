'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const { address: Address, strategyConfig } = require('../utils/chains').getChainData()

describe('vETH pool EarnAaveMakerStrategyETH strategy', function () {
  const strategy = strategyConfig.EarnAaveMakerStrategyETH
  strategy.config.debtRatio = 9000
  const strategies = [strategy]
  prepareConfig(strategies, { growPool: { address: Address.vaDAI } })
  for (let i = 0; i < strategies.length; i++) {
    shouldBehaveLikeStrategy(i, strategies[i].type, strategies[i].contract)
  }
})
