'use strict'

const testRunner = require('../../../utils/testRunner')

describe('VAWBTCe Pool', function () {
  testRunner('VAWBTCe', ['VesperTraderJoeXYStrategyWBTC_USDCe'], [{ debtRatio: 9500 }])
  testRunner('VAWBTCe', ['VesperTraderJoeXYStrategyWBTC_WETHe'], [{ debtRatio: 9500 }])
})
