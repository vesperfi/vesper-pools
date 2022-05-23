'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAUSDC Pool', function () {
  testRunner('VAUSDC', ['RariFuseStrategyUSDC'], [{ debtRatio: 9000 }])
})
