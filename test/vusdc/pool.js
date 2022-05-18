'use strict'
const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeMultiStrategyPool } = require('../behavior/vesper-multi-strategy-pool')

describe('vUSDC Pool', function () {
  prepareConfig()
  shouldBehaveLikePool('vUSDC', 'USDC')
  shouldBehaveLikeMultiStrategyPool('vUSDC')
})
