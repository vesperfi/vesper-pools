'use strict'

const testRunner = require('../../../utils/testRunner')

describe('VAETH Pool', function () {
  testRunner('VAETH', ['VesperCompoundXYStrategyETH_WBTC'], [{ debtRatio: 9000 }])
  testRunner('VAETH', ['VesperCompoundXYStrategyETH_LINK'], [{ debtRatio: 9000 }])
})
