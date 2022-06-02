'use strict'

const testRunner = require('../../../utils/testRunner')

describe('VAUSDC Pool', function () {
  testRunner('VAUSDC', ['Crv3PoolStrategyUSDC'], [{ debtRatio: 10000 }])
})
