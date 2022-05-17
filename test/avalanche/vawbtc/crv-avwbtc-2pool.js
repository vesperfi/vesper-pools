'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../../behavior/vesper-pool')
const { shouldBehaveLikeStrategy } = require('../../behavior/strategy')

const { strategyConfig } = require('../../utils/chains').getChainData()

describe('vaWBTC Pool with avWBTC/renBTC 2Pool', function () {
  const strategy = strategyConfig.Crv2PoolAvaStrategyAvWBTCRenBTC
  strategy.config.debtRatio = 10000
  prepareConfig([strategy])

  describe('Pool Tests', function () {
    shouldBehaveLikePool('vaWBTC', 'WBTC')
  })

  describe('Strategy Tests', function () {
    shouldBehaveLikeStrategy(0, strategy.type, strategy.contract)
  })
})
