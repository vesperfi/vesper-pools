'use strict'

const testRunner = require('../../../../utils/testRunner')

describe('VAWBTC Pool', function () {
  testRunner('VAWBTC', ['Convex4MetaPoolStrategyIBBTCPoolWBTC'], [{ debtRatio: 10000 }])
})
