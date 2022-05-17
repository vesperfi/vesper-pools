'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeMultiStrategyPool } = require('../behavior/vesper-multi-strategy-pool')

describe('vMATIC Pool', function () {
  prepareConfig()
  shouldBehaveLikePool('vMATIC', 'WMATIC')
  shouldBehaveLikeMultiStrategyPool('vMATIC')
})
