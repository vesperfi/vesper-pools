'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAUSDCe Pool', function () {
  testRunner('VAUSDCe', ['TraderJoeLeverageStrategyUSDCe'], [{ debtRatio: 9000 }])
})
