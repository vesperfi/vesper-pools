'use strict'
const { prepareConfig } = require('./config')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')

const { strategyConfig } = require('../utils/chains').getChainData()
const AaveStrategyUSDC = strategyConfig.AaveStrategyUSDC
const AaveV1StrategyUSDC = strategyConfig.AaveV1StrategyUSDC

describe('vUSDC with aaveV1 and aave strategies', function () {
  AaveStrategyUSDC.config.debtRatio = 4000
  AaveV1StrategyUSDC.config.debtRatio = 4000
  const _strategies = [AaveStrategyUSDC, AaveV1StrategyUSDC]

  const strategies = prepareConfig(_strategies)

  for (let i = 0; i < strategies.length; i++) {
    shouldBehaveLikeStrategy(i, strategies[i].type, strategies[i].contract)
  }
})
