'use strict'

const { prepareConfig } = require('./config')
const network = require('./../utils/network')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const { strategyConfig } = require('../utils/chains').getChainData()

describe('vaDAI Pool', function () {
  if (network.AVALANCHE === process.env.TEST_CHAIN) {
    const strategy1 = strategyConfig.AlphaLendAvalancheStrategyDAI
    strategy1.config.debtRatio = 9000
    const strategies = [strategy1]

    prepareConfig(strategies)
    shouldBehaveLikePool('vaDAI', 'DAI')
    shouldBehaveLikeStrategy(0, strategies[0].type, strategies[0].contract)
  }
})
