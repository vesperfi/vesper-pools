'use strict'
const {deployContract, getUsers, setupVPool} = require('../utils/setupHelper')
const {shouldBehaveLikeStrategy} = require('../behavior/strategy')
const address = require('../../helper/ethereum/address')
const StrategyType = require('../utils/strategyTypes')
const PoolConfig = require('../../helper/ethereum/poolConfig')
const {BigNumber: BN} = require('ethers')
const swapper = require('../utils/tokenSwapper')
const {ethers} = require('hardhat')

describe('veWBTC pool strategies', function () {

  const interestFee = '2500' // 15%
  const ONE_MILLION = ethers.utils.parseEther('1000000')
  const strategies = [
    {
      name: 'EarnVesperMakerStrategyWBTC',
      type: StrategyType.EARN_VESPER_MAKER,
      config: {interestFee, debtRatio: 9000, debtRate: ONE_MILLION},
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
      poolConfig: PoolConfig.VAWBTC,
      feeCollector: users[7].address,
      vPool,
      strategies: strategies.map((item, i) => ({
        ...item,
        feeCollector: users[i + 8].address, // leave first 8 users for other testing
      })),
    }, async function beforeCreateStrategies(obj) {
      const vsp = await ethers.getContractAt('ERC20', address.VSP)
      const TOTAL_REWARD = ethers.utils.parseUnits('5')
      const REWARD_DURATION = 2 * 24 * 60 * 60
      
      const poolRewards = await deployContract('PoolRewards', [])
      poolRewards.initialize(vPool.address, [address.VSP])
      vPool.updatePoolRewards(poolRewards.address)
  
      // swap 2 ETH to VSP to fill rewards
      await swapper.swapEthForToken(BN.from(2), vsp.address, users[0], poolRewards.address)
      poolRewards['notifyRewardAmount(address,uint256,uint256)'](vsp.address, TOTAL_REWARD, REWARD_DURATION)
  
      const vesperEarnDripImpl = await deployContract('VesperEarnDrip', [])
      // Deploy proxy admin
      const proxyAdmin = await deployContract('ProxyAdmin', [])
      const initData = vesperEarnDripImpl.interface.encodeFunctionData('initialize', [
        obj.pool.address,
        [vPool.address],
      ])
      // deploy proxy with logic implementation
      const proxy = await deployContract('TransparentUpgradeableProxy', [
        vesperEarnDripImpl.address,
        proxyAdmin.address,
        initData,
      ])
      // Get implementation from proxy
      obj.earnDrip = await ethers.getContractAt('VesperEarnDrip', proxy.address)
      await obj.earnDrip.updateGrowToken(vPool.address)
      await obj.pool.updatePoolRewards(proxy.address)
    })


    for (const strategy of this.strategies) {
      await strategy.instance.approveGrowToken()
    }

  })

  for (let i = 0; i < strategies.length; i++) {
    shouldBehaveLikeStrategy(i, strategies[i].type, strategies[i].name)
  }
})
