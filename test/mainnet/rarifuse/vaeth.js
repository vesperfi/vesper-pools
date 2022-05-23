'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAETH Pool', function () {
  testRunner('VAETH', ['RariFuseStrategyETH'], [{ debtRatio: 9000 }])
})
