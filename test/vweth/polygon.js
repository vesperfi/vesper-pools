'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeMultiPool } = require('../behavior/vesper-multi-pool')
const network = require('./../utils/network')

describe('vWETH Pool', function () {
  if (network.POLYGON === process.env.TEST_CHAIN) {
    prepareConfig()
    shouldBehaveLikePool('vWETH', 'WETH')
    shouldBehaveLikeMultiPool('vWETH')
  }
})
