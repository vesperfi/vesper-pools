'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const { address: Address, strategyConfig } = require('../utils/chains').getChainData()

describe('veDAI Pool with EarnVesperStrategyDAIVSP', function () {
  const strategy1 = strategyConfig.EarnVesperStrategyDAIVSP
  strategy1.config.debtRatio = 9000
  const strategies = [strategy1]
  prepareConfig(strategies, { growPool: { address: Address.Vesper.vVSP } })

  describe('Pool Tests', function () {
    shouldBehaveLikePool('veDAI', 'DAI', true)
  })

  for (let i = 0; i < strategies.length; i++) {
    shouldBehaveLikeStrategy(i, strategies[i].type, strategies[i].contract)
  }
})
