'use strict'

const testRunner = require('../../../../utils/testRunner')

describe('VEWBTC_DAI Pool', function () {
  testRunner('VEWBTC_DAI', ['EarnVesperMakerStrategyWBTC_DAI'], [{ debtRatio: 9500 }])
})
