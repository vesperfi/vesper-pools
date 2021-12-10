'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const { strategyConfig } = require('../utils/chains').getChainData()

describe('vDAI Pool with YearnStrategyDAI', function () {
  const strategy = strategyConfig.YearnStrategyDAI
  strategy.config.debtRatio = 9000
  const strategies = [strategy]
  prepareConfig(strategies)
  shouldBehaveLikePool('vDAI', 'DAI')
  shouldBehaveLikeStrategy(0, strategies[0].type, strategies[0].contract)
})
