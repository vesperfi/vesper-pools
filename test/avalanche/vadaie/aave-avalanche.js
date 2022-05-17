'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikeStrategy } = require('../../behavior/strategy')
const { shouldBehaveLikePool } = require('../../behavior/vesper-pool')
const { shouldMigrateStrategies } = require('../../behavior/strategy-migration')
const { strategyConfig } = require('../../utils/chains').getChainData()

describe('vDAI Pool', function () {
  const strategy1 = strategyConfig.AaveStrategyAvalancheDAIe
  strategy1.config.debtRatio = 9000

  const strategies = [strategy1]
  prepareConfig(strategies)
  shouldBehaveLikePool('vDAI', 'DAI')
  shouldBehaveLikeStrategy(0, strategies[0].type, strategies[0].contract)
  shouldMigrateStrategies('vDAI')
})
