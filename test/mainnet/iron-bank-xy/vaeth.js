'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAETH Pool', function () {
  testRunner('VAETH', ['IronBankXYStrategyETH_DAI'], [{ debtRatio: 9000 }])
})
