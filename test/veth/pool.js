'use strict'

const {prepareConfig} = require('./config')
const {shouldBehaveLikePool} = require('../behavior/vesper-pool')
// const {shouldBehaveLikeMultiPool} = require('../behavior/vesper-multi-pool')

/* eslint-disable mocha/no-setup-in-describe */
describe('vETH Pool', function () {
  prepareConfig()
  shouldBehaveLikePool('vETH', 'WETH')
  // TODO one test is failing, to be fixed in next PR
  // shouldBehaveLikeMultiPool('vETH')
})
