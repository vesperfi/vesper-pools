'use strict'
const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeMultiPool } = require('../behavior/vesper-multi-pool')

describe('vUSDT Pool', function () {
  prepareConfig()
  shouldBehaveLikePool('vUSDT', 'USDT')
  shouldBehaveLikeMultiPool('vUSDT')
})
