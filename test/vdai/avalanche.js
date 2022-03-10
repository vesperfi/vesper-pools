'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeMultiPool } = require('../behavior/vesper-multi-pool')
const { strategyConfig } = require('../utils/chains').getChainData()

const strategy1 = strategyConfig.AaveStrategyAvalancheDAI
const strategy2 = strategyConfig.AaveStrategyAvalancheDAI

describe('vDAI Pool', function () {
  strategy1.config.debtRatio = 4000
  strategy2.config.debtRatio = 4000
  const strategies = [strategy1, strategy2]
  prepareConfig(strategies)
  shouldBehaveLikePool('vDai', 'DAI')
  shouldBehaveLikeMultiPool('vDai')
  shouldBehaveLikeStrategy(0, strategies[0].type, strategies[0].contract)
})
