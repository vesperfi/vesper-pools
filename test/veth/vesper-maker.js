'use strict'
const { deployContract, getUsers, setupVPool } = require('../utils/setupHelper')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const address = require('../../helper/ethereum/address')
const StrategyType = require('../utils/strategyTypes')
const PoolConfig = require('../../helper/ethereum/poolConfig')
const { ethers } = require('hardhat')

describe('vaETH pool strategies', function () {
  const interestFee = '1500' // 15%
  const ONE_MILLION = ethers.utils.parseEther('100000000')
  const strategies = [
    {
      name: 'VesperMakerStrategyETH',
      type: StrategyType.VESPER_MAKER,
      config: { interestFee, debtRatio: 9500, debtRate: ONE_MILLION },
    },
  ]
  beforeEach(async function () {
    const users = await getUsers()
    this.users = users

    // Setup vPool (vDAI)
    const vPool = await deployContract(PoolConfig.VDAI.contractName, PoolConfig.VDAI.poolParams)
    const accountant = await deployContract('PoolAccountant')
    await accountant.init(vPool.address)
    await vPool.initialize(...PoolConfig.VDAI.poolParams, accountant.address, address.ADDRESS_LIST_FACTORY)

    await setupVPool(this, {
      poolConfig: PoolConfig.VAETH,
      feeCollector: users[7].address,
      vPool,
      strategies: strategies.map((item, i) => ({
        ...item,
        feeCollector: users[i + 8].address, // leave first 8 users for other testing
      })),
    })
  })

  for (let i = 0; i < strategies.length; i++) {
    shouldBehaveLikeStrategy(i, strategies[i].type, strategies[i].name)
  }
})
