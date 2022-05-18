'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../../behavior/vesper-pool')
const { shouldBehaveLikeMultiPool } = require('../../behavior/vesper-multi-pool')

describe('vaAVAX Pool', function () {
  prepareConfig()
  shouldBehaveLikePool('vaAVAX', 'WAVAX')
  shouldBehaveLikeMultiPool('vaAVAX')
})
