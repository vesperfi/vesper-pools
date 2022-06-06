'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAUSDC Pool', function () {
  testRunner('VAUSDC', ['BenqiLeverageStrategyUSDC'], [{ debtRatio: 9000 }])
})
