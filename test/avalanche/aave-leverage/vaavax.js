'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAAVAX Pool', function () {
  testRunner('VAAVAX', ['AaveLeverageStrategyAVAX'], [{ debtRatio: 9000 }])
})
