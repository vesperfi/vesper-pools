'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAWBTC Pool', function () {
  testRunner('VAWBTC', ['RariFuseStrategyWBTC'], [{ debtRatio: 9000 }])
})
