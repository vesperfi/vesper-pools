'use strict'

const testRunner = require('../../utils/testRunner')

describe('VADAI Pool', function () {
  testRunner('VADAI', ['AaveStrategyDAI'], [{ debtRatio: 9000 }])
})
