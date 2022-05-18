'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../../behavior/vesper-pool')
const { shouldBehaveLikeMultiStrategyPool } = require('../../behavior/vesper-multi-strategy-pool')

describe('vaAVAX Pool', function () {
  prepareConfig()
  shouldBehaveLikePool('vaAVAX', 'WAVAX')
  shouldBehaveLikeMultiStrategyPool('vaAVAX')
})
