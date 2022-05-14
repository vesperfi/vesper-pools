'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeMultiPool } = require('../behavior/vesper-multi-pool')

describe('vMATIC Pool', function () {
  prepareConfig()
  shouldBehaveLikePool('vMATIC', 'WMATIC')
  shouldBehaveLikeMultiPool('vMATIC')
})
