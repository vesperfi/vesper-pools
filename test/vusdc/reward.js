'use strict'
const {prepareConfig} = require('./config')
const {shouldClaimAaveRewards} = require('../behavior/aave-reward')

describe('vUSDC pool reward', function () {
  prepareConfig()
  shouldClaimAaveRewards(0) // aave strategy at index 0
})
