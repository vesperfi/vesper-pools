'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAWBTCe Pool', function () {
  testRunner('VAWBTCe', ['VesperTraderJoeXYStrategyWBTC_USDCe'], [{ debtRatio: 9500 }])
})
