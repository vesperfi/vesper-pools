'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAUSDCe Pool', function () {
  testRunner('VAUSDCe', ['TraderJoeStrategyUSDCe'], [{ debtRatio: 9000 }])
})
