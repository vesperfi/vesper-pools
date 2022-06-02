'use strict'

const testRunner = require('../../../../utils/testRunner')

describe('VADAI Pool', function () {
  testRunner('VADAI', ['Crv4PoolStrategySUSDPoolDAI'], [{ debtRatio: 10000 }])
})
