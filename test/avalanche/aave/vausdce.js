'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAUSDCe Pool', function () {
  testRunner('VAUSDCe', ['AaveStrategyUSDCe'], [{ debtRatio: 9000 }])
})
