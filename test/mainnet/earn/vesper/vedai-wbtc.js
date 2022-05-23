'use strict'

const testRunner = require('../../../utils/testRunner')
const { address: Address } = require('../../../utils/chains').getChainData()

describe('VEDAI_WBTC Pool', function () {
  testRunner('VEDAI_WBTC', ['EarnVesperStrategyDAIWBTC'], [{ debtRatio: 9000 }], {
    growPool: { address: Address.Vesper.vaWBTC },
  })
})
