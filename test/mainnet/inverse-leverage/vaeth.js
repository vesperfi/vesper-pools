'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAETH Pool', function () {
  testRunner('VAETH', ['InverseCompoundLeverageStrategyETH'], [{ debtRatio: 9000 }])
})
