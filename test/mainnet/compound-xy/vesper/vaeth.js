'use strict'

const testRunner = require('../../../utils/testRunner')

describe('VAETH Pool', function () {
  testRunner('VAETH', ['VesperCompoundXYStrategyETH_WBTC'], [{ debtRatio: 9000 }])
})
