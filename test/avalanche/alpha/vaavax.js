'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAAVAX Pool', function () {
  testRunner('VAAVAX', ['AlphaLendStrategyAVAX'], [{ debtRatio: 9000 }])
})
