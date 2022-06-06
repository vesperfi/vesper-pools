'use strict'

const testRunner = require('../../../../utils/testRunner')

describe('VEETH_DAI Pool', function () {
  testRunner('VEETH_DAI', ['EarnVesperMakerStrategyETH_DAI'], [{ debtRatio: 9500 }])
})
