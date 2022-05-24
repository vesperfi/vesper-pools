'use strict'

const testRunner = require('../../../utils/testRunner')

describe('VAETH Pool', function () {
  testRunner('VAETH', ['VesperCompoundXYStrategyETH_DAI'], [{ debtRatio: 9000 }])
})
