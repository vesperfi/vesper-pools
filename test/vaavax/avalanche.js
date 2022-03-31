'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeMultiPool } = require('../behavior/vesper-multi-pool')
const network = require('./../utils/network')

describe('vaAVAX Pool', function () {
  if (network.AVALANCHE === process.env.TEST_CHAIN) {
    prepareConfig()
    shouldBehaveLikePool('vaAVAX', 'WAVAX')
    shouldBehaveLikeMultiPool('vaAVAX')
  }
})
