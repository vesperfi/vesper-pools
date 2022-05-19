'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAETH Pool', function () {
  testRunner('VAETH', ['CompoundLeverageStrategyETH'], [{ debtRatio: 9000 }])
})
