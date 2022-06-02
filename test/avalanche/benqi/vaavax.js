'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAAVAX Pool', function () {
  testRunner('VAAVAX', ['BenqiStrategyAVAX'], [{ debtRatio: 9800 }])
})
