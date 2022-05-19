'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAAVAX Pool', function () {
  testRunner('VAAVAX', ['TraderJoeStrategyAVAX'], [{ debtRatio: 9000 }])
})
