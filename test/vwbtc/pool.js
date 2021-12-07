'use strict'
const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeMultiPool } = require('../behavior/vesper-multi-pool_new')

describe('vWBTC Pool', function () {
  prepareConfig()
  shouldBehaveLikePool('vWBTC', 'WBTC')
  shouldBehaveLikeMultiPool('vWBTC')
})
