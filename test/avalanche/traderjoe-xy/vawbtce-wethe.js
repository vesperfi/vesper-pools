'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAWBTCe Pool', function () {
  testRunner('VAWBTCe', ['VesperTraderJoeXYStrategyWBTC_WETHe'], [{ debtRatio: 9500 }])
})
