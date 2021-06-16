'use strict'

const {prepareConfig} = require('./config')
const {shouldBehaveLikeStrategy} = require('../behavior/strategy')

describe('vLINK Pool', function () {
  const strategies = prepareConfig()
  shouldBehaveLikeStrategy(0, strategies[0].type, strategies[0].name)
})
