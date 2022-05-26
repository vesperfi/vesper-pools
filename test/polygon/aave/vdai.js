'use strict'

const testRunner = require('../../utils/testRunner')

describe('VDAI Pool', function () {
  testRunner('VDAI', ['AaveStrategyDAI'], [{ debtRatio: 9000 }])
})
