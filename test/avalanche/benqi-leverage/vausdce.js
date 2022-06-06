'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAUSDCe Pool', function () {
  testRunner('VAUSDCe', ['BenqiLeverageStrategyUSDCe'], [{ debtRatio: 9000 }])
})
