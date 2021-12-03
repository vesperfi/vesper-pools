'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeMultiPool } = require('../behavior/vesper-multi-pool_new')

describe('vWETH Pool', function () {
  prepareConfig()
  shouldBehaveLikePool('vWETH', 'WETH')
  shouldBehaveLikeMultiPool('vWETH')
})
