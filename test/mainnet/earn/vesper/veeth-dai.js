'use strict'

const testRunner = require('../../../utils/testRunner')
const { address: Address } = require('../../../utils/chains').getChainData()

describe('VEETH_DAI Pool', function () {
  testRunner('VEETH_DAI', ['EarnVesperStrategyETH_DAI'], [{ debtRatio: 9000 }], {
    growPool: { address: Address.Vesper.vaDAI },
  })
})
