'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAUSDCe Pool', function () {
  testRunner('VAUSDCe', ['AlphaLendStrategyUSDCe'], [{ debtRatio: 9000 }])
})
