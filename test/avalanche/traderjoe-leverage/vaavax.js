'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAAVAX Pool', function () {
  testRunner('VAAVAX', ['TraderJoeLeverageStrategyAVAX'], [{ debtRatio: 9000 }])
})
