'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAUSDCe Pool', function () {
  testRunner('VAUSDCe', ['BenqiStrategyUSDCe'], [{ debtRatio: 9500 }])
})
