'use strict'

const testRunner = require('../../../utils/testRunner')
const { address: Address } = require('../../../utils/chains').getChainData()

describe('VEWBTC_DAI Pool', function () {
  testRunner('VEWBTC_DAI', ['EarnVesperStrategyWBTC_DAI'], [{ debtRatio: 9500 }], {
    growPool: { address: Address.Vesper.vaDAI },
  })
})
