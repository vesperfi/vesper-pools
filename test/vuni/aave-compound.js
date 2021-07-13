'use strict'
const { shouldMigrateStrategies } = require('../behavior/strategy-migration')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const { prepareConfig } = require('./config')

describe('vUNI Pool', function () {
  const strategies = prepareConfig()

  for (let i = 0; i < strategies.length; i++) {
    shouldBehaveLikeStrategy(i, strategies[i].type, strategies[i].name)
  }
  shouldMigrateStrategies('vUni')
})
