'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeMultiStrategyPool } = require('../behavior/vesper-multi-strategy-pool')

describe('vLINK Pool', function () {
  prepareConfig()
  shouldBehaveLikePool('vLINK', 'LINK')
  shouldBehaveLikeMultiStrategyPool('vLINK')
})
