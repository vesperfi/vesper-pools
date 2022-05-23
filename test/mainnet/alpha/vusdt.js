'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAUSDT Pool', function () {
  testRunner('VAUSDT', ['AlphaLendStrategyUSDT'], [{ debtRatio: 9000 }])
})
