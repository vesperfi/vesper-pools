'use strict'

const testRunner = require('../../utils/testRunner')

describe('VAAPE Pool', function () {
  testRunner('VAAPE', ['RariFuseStrategyAPE'], [{ debtRatio: 9000 }])
})
