'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAETH Pool', function () {
  testRunner('VAETH', ['CompoundXYStrategyETH_DAI'], [{ debtRatio: 9000 }])
})
