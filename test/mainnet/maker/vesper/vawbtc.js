'use strict'

const testRunner = require('../../../utils/testRunner')

describe('VAWBTC Pool', function () {
  testRunner('VAWBTC', ['VesperMakerStrategyWBTC'], [{ debtRatio: 9000 }])
})
