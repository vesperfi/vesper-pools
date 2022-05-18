'use strict'
const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeMultiStrategyPool } = require('../behavior/vesper-multi-strategy-pool')

describe('vUSDT Pool', function () {
  prepareConfig()
  shouldBehaveLikePool('vUSDT', 'USDT')
  shouldBehaveLikeMultiStrategyPool('vUSDT')
})
