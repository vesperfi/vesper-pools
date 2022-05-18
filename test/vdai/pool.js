'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeMultiStrategyPool } = require('../behavior/vesper-multi-strategy-pool')

describe('vDAI Pool', function () {
  prepareConfig()
  shouldBehaveLikePool('vDai', 'DAI')
  shouldBehaveLikeMultiStrategyPool('vDai')
})
