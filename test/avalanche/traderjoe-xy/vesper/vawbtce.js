'use strict'

const testRunner = require('../../../utils/testRunner')

describe('VAWBTCe Pool', function () {
  testRunner('VAWBTCe', ['VesperTraderJoeXYStrategyWBTCe_USDCe'], [{ debtRatio: 9500 }])
  testRunner('VAWBTCe', ['VesperTraderJoeXYStrategyWBTCe_WETHe'], [{ debtRatio: 9500 }])
})
