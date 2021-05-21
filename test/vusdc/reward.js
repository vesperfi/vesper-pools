'use strict'
const {prepareConfig} = require('./config')
const {shouldClaimAaveRewards} = require('../behavior/aave-reward')

/* eslint-disable mocha/no-setup-in-describe */
describe('vUSDC pool reward', function () {
  prepareConfig()
  shouldClaimAaveRewards(0) // aave strategy at index 0
})
