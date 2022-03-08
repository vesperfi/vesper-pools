'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const { strategyConfig } = require('../utils/chains').getChainData()

describe('vaWBTC Pool', function () {
  const strategy1 = strategyConfig.AlphaLendAvalancheStrategyWBTC
  strategy1.config.debtRatio = 9000
  const strategies = [strategy1]

  prepareConfig(strategies)
  shouldBehaveLikePool('vaWBTC', 'WBTC')
  shouldBehaveLikeStrategy(0, strategies[0].type, strategies[0].contract)
})
