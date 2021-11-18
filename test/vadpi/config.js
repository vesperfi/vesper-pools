'use strict'

const { getUsers, setupVPool } = require('../utils/setupHelper')
const StrategyType = require('../utils/strategyTypes')
const { getChain } = require('../utils/chains')
const PoolConfig = require(`../../helper/${getChain()}/poolConfig`)
const { ethers } = require('hardhat')

function prepareConfig(_strategies) {
  const interestFee = '1500' // 15%
  const strategies = _strategies || [
    {
      name: 'AlphaLendStrategyDPI',
      type: StrategyType.ALPHA_LEND,
      config: { interestFee, debtRatio: 9000, debtRate: ethers.utils.parseEther('1000000') },
    },
  ]

  beforeEach(async function () {
    const users = await getUsers()
    this.users = users
    await setupVPool(this, {
      poolConfig: PoolConfig.VADPI,
      feeCollector: users[7].address,
      strategies: strategies.map((item, i) => ({
        ...item,
        feeCollector: users[i + 8].address, // leave first 8 users for other testing
      })),
    })
  })
  return strategies
}

module.exports = { prepareConfig }
