'use strict'

const testRunner = require('../../../utils/testRunner')

describe('VAETH Pool', function () {
  testRunner('VAETH', ['VesperAaveXYStrategyETH_DAI'], [{ debtRatio: 9000 }])
  testRunner('VAETH', ['VesperAaveXYStrategyETH_FEI'], [{ debtRatio: 9000 }])
})
