'use strict'

const testRunner = require('../../utils/testRunner')

describe('VADPI Pool', function () {
  testRunner('VADPI', ['IronBankXYStrategyDPI_DAI'], [{ debtRatio: 9000 }])
})
