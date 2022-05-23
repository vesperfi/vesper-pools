'use strict'

const testRunner = require('../../utils/testRunner')

describe('VADAI Pool', function () {
  testRunner('VADAI', ['RariFuseStrategyDAI'], [{ debtRatio: 9000 }])
})
