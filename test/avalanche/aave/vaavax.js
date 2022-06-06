'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAAVAX Pool', function () {
  testRunner('VAAVAX', ['AaveStrategyAVAX'], [{ debtRatio: 9000 }])
})
