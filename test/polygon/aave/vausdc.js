'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAUSDC Pool', function () {
  testRunner('VAUSDC', ['AaveStrategyUSDC'], [{ debtRatio: 9000 }])
})
