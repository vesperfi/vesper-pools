'use strict'

const {prepareConfig} = require('./config')
const {shouldBehaveLikeStrategy} = require('../behavior/strategy')
const {deployContract} = require('../utils/setupHelper')
const Address = require('../../helper/ethereum/address')
const StrategyType = require('../utils/strategyTypes')
const {ethers} = require('hardhat')

describe('veETH pool strategies', function () {

  const interestFee = '2500' // 15%
  const ONE_MILLION = ethers.utils.parseEther('1000000')
  const strategies = [
    {
      name: 'EarnAaveStrategyWETH',
      type: StrategyType.EARN_AAVE,
      config: {interestFee, debtRatio: 9000, debtRate: ONE_MILLION},
    },
  ]
  prepareConfig(strategies)
  beforeEach(async function () {
    const vesperEarnDripImpl = await deployContract('VesperEarnDrip', [])
    // Deploy proxy admin
    const proxyAdmin = await deployContract('ProxyAdmin', [])
    const initData = vesperEarnDripImpl.interface.encodeFunctionData('initialize', [this.pool.address, Address.DAI])
    // deploy proxy with logic implementation
    const proxy = await deployContract('TransparentUpgradeableProxy', [
      vesperEarnDripImpl.address,
      proxyAdmin.address,
      initData,
    ])
    // Get implementation from proxy
    this.earnDrip = await ethers.getContractAt('VesperEarnDrip', proxy.address)
    await this.pool.updatePoolRewards(proxy.address)
  })
  for (let i = 0; i < strategies.length; i++) {
    shouldBehaveLikeStrategy(i, strategies[i].type, strategies[i].name)
  }
})
