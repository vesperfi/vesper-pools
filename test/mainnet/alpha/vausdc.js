'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAUSDC Pool', function () {
  testRunner('VAUSDC', ['AlphaLendStrategyUSDC'], [{ debtRatio: 9000 }])
})
