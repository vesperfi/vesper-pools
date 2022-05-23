'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAFEI Pool', function () {
  testRunner('VAFEI', ['RariFuseStrategyFEI'], [{ debtRatio: 9000 }])
})
