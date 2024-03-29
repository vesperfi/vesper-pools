'use strict'

const testRunner = require('../../../utils/testRunner')
const { address: Address } = require('../../../utils/chains').getChainData()

describe('VELINK_DAI Pool', function () {
  testRunner('VELINK_DAI', ['EarnVesperStrategyLINK_DAI'], [{ debtRatio: 9500 }], {
    growPool: { address: Address.Vesper.vaDAI },
  })
})
