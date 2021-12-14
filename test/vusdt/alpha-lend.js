'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')

const { strategyConfig } = require('../utils/chains').getChainData()

describe('vUSDT Pool', function () {
  const strategy1 = strategyConfig.AlphaLendStrategyUSDT
  strategy1.config.debtRatio = 9000
  const strategies = [strategy1]

  prepareConfig(strategies)
  shouldBehaveLikePool('vUSDT', 'USDT')
  shouldBehaveLikeStrategy(0, strategies[0].type, strategies[0].contract)
})
