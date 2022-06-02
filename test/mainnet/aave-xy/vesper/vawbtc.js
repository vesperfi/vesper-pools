'use strict'

const testRunner = require('../../../utils/testRunner')

describe('VAWBTC Pool', function () {
  testRunner('VAWBTC', ['VesperAaveXYStrategyWBTC_FEI'], [{ debtRatio: 9000 }])
  testRunner('VAWBTC', ['VesperAaveXYStrategyWBTC_FRAX'], [{ debtRatio: 9000 }])
})
