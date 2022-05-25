'use strict'

const testRunner = require('../../../utils/testRunner')

describe('VAAVAX Pool', function () {
  testRunner('VAAVAX', ['VesperTraderJoeXYStrategyAVAX'], [{ debtRatio: 9500 }])
})
