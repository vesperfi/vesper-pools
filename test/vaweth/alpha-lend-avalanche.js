'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const network = require('./../utils/network')
const { strategyConfig } = require('../utils/chains').getChainData()

describe('vaWETH Pool', function () {
  if (network.AVALANCHE === process.env.TEST_CHAIN) {
    const strategy1 = strategyConfig.AlphaLendAvalancheStrategyWETH
    strategy1.config.debtRatio = 9000
    const strategies = [strategy1]

    prepareConfig(strategies)
    shouldBehaveLikePool('vaWETH', 'WETH')
    shouldBehaveLikeStrategy(0, strategies[0].type, strategies[0].contract)
  }
})
