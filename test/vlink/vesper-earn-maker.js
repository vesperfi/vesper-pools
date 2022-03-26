'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { strategyConfig } = require('../utils/chains').getChainData()

describe('veLINK pool EarnVesperMakerStrategyLINK strategy', function () {
  const strategy = strategyConfig.EarnVesperMakerStrategyLINK
  strategy.config.debtRatio = 9000
  const strategies = [strategy]
  prepareConfig(strategies)

  shouldBehaveLikePool('veLINK', 'LINK', true)

  for (let i = 0; i < strategies.length; i++) {
    shouldBehaveLikeStrategy(i, strategies[i].type, strategies[i].contract)
  }
})
