'use strict'
const {prepareConfig} = require('./config')
const {shouldBehaveLikeStrategy} = require('../behavior/strategy')

/* eslint-disable mocha/no-setup-in-describe */
describe('vUSDC pool strategies', function () {
  const strategies = prepareConfig()
  for (let i = 0; i < strategies.length; i++) {
    shouldBehaveLikeStrategy(i, strategies[i].type, strategies[i].name)
  }
})
