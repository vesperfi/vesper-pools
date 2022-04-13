'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeMultiPool } = require('../behavior/vesper-multi-pool')
const network = require('./../utils/network')

describe('vMATIC Pool', function () {
  if (network.POLYGON === process.env.TEST_CHAIN) {
    prepareConfig()
    shouldBehaveLikePool('vMATIC', 'WMATIC')
    shouldBehaveLikeMultiPool('vMATIC')
  }
})
