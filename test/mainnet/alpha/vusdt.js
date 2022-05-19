'use strict'

const testRunner = require('../../utils/testRunner')

describe('VUSDT Pool', function () {
  testRunner('VUSDT', ['AlphaLendStrategyUSDT'], [{ debtRatio: 9000 }])
})
