'use strict'

const testRunner = require('../../../../utils/testRunner')

describe('VAWBTC Pool', function () {
  testRunner('VAWBTC', ['CrvSBTCPoolStrategyWBTC'], [{ debtRatio: 10000 }])
})
