'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeMultiStrategyPool } = require('../behavior/vesper-multi-strategy-pool')

describe('vWETH Pool', function () {
  prepareConfig()
  shouldBehaveLikePool('vWETH', 'WETH')
  shouldBehaveLikeMultiStrategyPool('vWETH')
})
