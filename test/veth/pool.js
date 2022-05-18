'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeMultiStrategyPool } = require('../behavior/vesper-multi-strategy-pool')

describe('vETH Pool', function () {
  prepareConfig()
  shouldBehaveLikePool('vETH', 'WETH')
  shouldBehaveLikeMultiStrategyPool('vETH')
})
