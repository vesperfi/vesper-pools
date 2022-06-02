'use strict'

const testRunner = require('../../utils/testRunner')

describe('VADAI Pool', function () {
  testRunner('VADAI', ['YearnStrategyDAI'], [{ debtRatio: 9000 }])
})
