'use strict'

const testRunner = require('../../../../utils/testRunner')

describe('VELINK_DAI Pool', function () {
  testRunner('VELINK_DAI', ['EarnVesperMakerStrategyLINK_DAI'], [{ debtRatio: 9500 }])
})
