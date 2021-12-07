'use strict'

const { prepareConfig } = require('./config_new')
const { setupEarnDrip } = require('../utils/setupHelper_new')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')

const { strategyConfig } = require('../utils/chains').getChainData()
const EarnAaveStrategyWETH = strategyConfig.EarnAaveStrategyWETH

describe('veETH pool strategies', function () {
  EarnAaveStrategyWETH.config.interestFee = '2500' // 25%
  EarnAaveStrategyWETH.config.debtRatio = '9000' // 90%

  const strategies = [EarnAaveStrategyWETH]
  prepareConfig(strategies)
  setupEarnDrip()

  describe('Pool Tests', function () {
    shouldBehaveLikePool('veETH', 'ETH', true)
  })

  for (let i = 0; i < strategies.length; i++) {
    shouldBehaveLikeStrategy(i, strategies[i].type, strategies[i].contract)
  }
})
