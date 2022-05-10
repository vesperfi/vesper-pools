'use strict'

const { prepareConfig } = require('../vusdc/config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const { shouldMigrateStrategies } = require('../behavior/strategy-migration')
const { address: Address, strategyConfig, poolConfig } = require('../utils/chains').getChainData()

describe('veUSDC Pool with EarnVesperStrategyUSDCLMR', function () {
  const strategy1 = strategyConfig.EarnVesperStrategyUSDCLMR
  strategy1.config.debtRatio = 9000
  const strategies = [strategy1]
  const option = {
    tokens: [Address.LMR],
    vesperPoolConfig: poolConfig.VUSDC,
  }
  prepareConfig(strategies, option)

  describe('Pool Tests', function () {
    shouldBehaveLikePool('veUSDC', 'USDC', true)
  })

  for (let i = 0; i < strategies.length; i++) {
    shouldBehaveLikeStrategy(i, strategies[i].type, strategies[i].contract)
  }

  shouldMigrateStrategies('veUSDC', option)
})
