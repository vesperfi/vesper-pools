'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../../behavior/vesper-pool')
const { shouldBehaveLikeStrategy } = require('../../behavior/strategy')

describe('vaQI Pool', function () {
  const strategies = prepareConfig()
  shouldBehaveLikePool('vaQI', 'QI')
  for (let i = 0; i < strategies.length; i++) {
    shouldBehaveLikeStrategy(i, strategies[i].type, strategies[i].contract)
  }
})
