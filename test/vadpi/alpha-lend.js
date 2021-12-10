'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')

describe('vDPI Pool', function () {
  const strategies = prepareConfig()
  shouldBehaveLikePool('vaDPI', 'DPI')
  shouldBehaveLikeStrategy(0, strategies[0].type, strategies[0].contract)
})
