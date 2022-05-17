'use strict'
const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeMultiStrategyPool } = require('../behavior/vesper-multi-strategy-pool')

describe('vWBTC Pool', function () {
  prepareConfig()
  shouldBehaveLikePool('vWBTC', 'WBTC')
  shouldBehaveLikeMultiStrategyPool('vWBTC')
})
