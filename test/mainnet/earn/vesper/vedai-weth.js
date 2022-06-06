'use strict'

const testRunner = require('../../../utils/testRunner')
const { address: Address } = require('../../../utils/chains').getChainData()

// Notice pool definition has ETH in name not WETH
describe('VEDAI_ETH Pool', function () {
  testRunner('VEDAI_ETH', ['EarnVesperStrategyDAI_WETH'], [{ debtRatio: 9000 }], {
    growPool: { address: Address.Vesper.vaETH },
  })
})
