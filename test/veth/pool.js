'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeMultiPool } = require('../behavior/vesper-multi-pool')

describe('vETH Pool', function () {
  prepareConfig()
  shouldBehaveLikePool('vETH', 'WETH')
  shouldBehaveLikeMultiPool('vETH')
})
