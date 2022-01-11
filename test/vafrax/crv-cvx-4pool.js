'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')

describe('vaFRAX Pool with Convex4MetaPoolStrategy', function () {
  const strategies = prepareConfig()

  describe('Pool Tests', function () {
    shouldBehaveLikePool('vaFRAX', 'FRAX')
  })

  describe('Strategy Tests', function () {
    shouldBehaveLikeStrategy(0, strategies[0].type, strategies[0].contract)
  })
})
