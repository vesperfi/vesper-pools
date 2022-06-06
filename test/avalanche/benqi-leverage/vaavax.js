'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAAVAX Pool', function () {
  testRunner('VAAVAX', ['BenqiLeverageStrategyAVAX'], [{ debtRatio: 9000 }])
})
