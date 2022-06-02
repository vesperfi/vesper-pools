'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAETH Pool', function () {
  testRunner('VAETH', ['DropsCompoundStrategyETH'], [{ debtRatio: 9000 }])
})
