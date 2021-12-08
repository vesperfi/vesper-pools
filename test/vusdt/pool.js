'use strict'
const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeMultiPool } = require('../behavior/vesper-multi-pool_new')

describe('vUSDT Pool', function () {
  prepareConfig()
  shouldBehaveLikePool('vUSDT', 'USDT')
  shouldBehaveLikeMultiPool('vUSDT')
})
