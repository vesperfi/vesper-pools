'use strict'

const testRunner = require('../../utils/testRunner')

describe('VUSDC Pool', function () {
  testRunner('VUSDC', ['AaveStrategyUSDC'], [{ debtRatio: 9000 }])
})
