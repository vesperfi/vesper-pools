'use strict'

const {prepareConfig} = require('./config')
// const {shouldClaimAaveRewards} = require('../behavior/aave-reward')

/* eslint-disable mocha/no-setup-in-describe */
describe('vETH pool reward', function () {
  prepareConfig()
  // TODO aave rewards test not working with AaveMakerStrategy
  // shouldClaimAaveRewards(0) // run Aave rewards tests
})
