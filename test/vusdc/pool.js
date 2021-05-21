'use strict'
const {prepareConfig} = require('./config')
const {shouldBehaveLikePool} = require('../behavior/vesper-pool')
const {shouldBehaveLikeMultiPool} = require('../behavior/vesper-multi-pool')

/* eslint-disable mocha/no-setup-in-describe */
describe('vUSDC Pool', function () {
  prepareConfig()
  shouldBehaveLikePool('vUSDC', 'USDC')
  shouldBehaveLikeMultiPool('vUSDC')
})
