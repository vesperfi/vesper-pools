'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAUSDC Pool', function () {
  testRunner('VAUSDC', ['TraderJoeLeverageStrategyUSDC'], [{ debtRatio: 9000 }])
})
