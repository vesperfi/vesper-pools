'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeMultiPool } = require('../behavior/vesper-multi-pool')

describe('vWETH Pool', function () {
  prepareConfig()
  shouldBehaveLikePool('vWETH', 'WETH')
  shouldBehaveLikeMultiPool('vWETH')
})
