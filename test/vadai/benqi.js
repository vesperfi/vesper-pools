'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const network = require('./../utils/network')
const { strategyConfig } = require('../utils/chains').getChainData()

describe('vaDAI Pool', function () {
  if (network.AVALANCHE === process.env.TEST_CHAIN) {
    const strategy = strategyConfig.BenqiCompoundStrategyAvalancheDAI
    strategy.config.debtRatio = 9000

    const strategies = [strategy]
    prepareConfig(strategies)
    for (let i = 0; i < strategies.length; i++) {
      shouldBehaveLikeStrategy(i, strategies[i].type, strategies[i].contract)
    }
  }
})
