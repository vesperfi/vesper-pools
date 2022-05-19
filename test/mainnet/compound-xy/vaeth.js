'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAETH Pool', function () {
  testRunner('VAETH', ['CompoundXYStrategyETH'], [{ debtRatio: 9000 }])
})
