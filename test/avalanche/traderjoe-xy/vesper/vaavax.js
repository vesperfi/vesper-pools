'use strict'

const testRunner = require('../../../utils/testRunner')

describe('VAAVAX Pool', function () {
  testRunner('VAAVAX', ['VesperTraderJoeXYStrategyAVAX_WETHe'], [{ debtRatio: 9500 }])
})
