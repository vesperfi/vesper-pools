'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { strategyConfig } = require('../utils/chains').getChainData()

describe('vUSDC Pool', function () {
  const strategy = strategyConfig.RariFuseStrategy
  strategy.config.debtRatio = 9000

  const strategies = [strategy]
  prepareConfig(strategies)
  shouldBehaveLikePool('vUsdc', 'USDC')
  for (let i = 0; i < strategies.length; i++) {
    shouldBehaveLikeStrategy(i, strategies[i].type, strategies[i].contract)
  }
})
