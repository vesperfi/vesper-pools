'use strict'

const {expect} = require('chai')
const hre = require('hardhat')
const ethers = hre.ethers
const poolOps = require('./utils/poolOps')
const {deployContract, getUsers, createStrategy} = require('./utils/setupHelper')
const StrategyType = require('./utils/strategyTypes')
const addressListFactory = hre.address.ADDRESS_LIST_FACTORY
const VDAI = require('../helper/ethereum/poolConfig').VDAI
const MULTICALL = require('../helper/ethereum/address').MULTICALL

describe('Vesper Pool: proxy', function () {
  const poolName = VDAI.contractName
  const poolParams = VDAI.poolParams
  let pool, poolImpl, strategy, collateralToken
  let proxy, proxyAdmin
  let governor, user1, user2, user3, user4

  const strategyConfig = {
    name: 'AaveStrategyDAI',
    type: StrategyType.AAVE,
    config: {interestFee: '1500', debtRatio: 9000, debtRate: ethers.utils.parseEther('1000000')},
  }

  beforeEach(async function () {
    const users = await getUsers()
    ;[governor, user1, user2, user3, user4] = users
    let accountant = await deployContract('PoolAccountant')
    poolImpl = await deployContract(poolName, poolParams)
    // Deploy proxy admin
    proxyAdmin = await deployContract('ProxyAdmin', [])
    // deploy accountant proxy with logic implementation
    const accountantProxy = await deployContract('TransparentUpgradeableProxy', [
      accountant.address,
      proxyAdmin.address,
      [],
    ])
    accountant = await ethers.getContractAt('PoolAccountant', accountantProxy.address)

    const initData = poolImpl.interface.encodeFunctionData('initialize', [
      ...poolParams,
      accountantProxy.address,
      addressListFactory,
    ])
    // deploy pool proxy with logic implementation
    proxy = await deployContract('TransparentUpgradeableProxy', [poolImpl.address, proxyAdmin.address, initData])
    // Get implementation from proxy
    pool = await ethers.getContractAt(poolName, proxy.address)
    // Init accountant proxy with pool proxy address
    await accountant.init(pool.address)

    collateralToken = await ethers.getContractAt('ERC20', await pool.token())
    strategyConfig.feeCollector = user4.address
    strategy = await createStrategy(strategyConfig, pool.address, {addressListFactory})
    await accountant.addStrategy(strategy.address, ...Object.values(strategyConfig.config))
  })

  context('Proxy upgrade', function () {
    it('Should upgrade pool directly and still have keep storage', async function () {
      await poolOps.deposit(pool, collateralToken, 10, user1)
      await poolOps.deposit(pool, collateralToken, 10, user2)
      const totalSupply1 = await pool.totalSupply()
      expect(totalSupply1).to.be.gt(0, 'Total supply should be > 0')
      await strategy.rebalance()

      const oldPoolImpl = await proxyAdmin.getProxyImplementation(proxy.address)
      const oldPool = pool.address
      // Deploy new pool
      const newPool = await deployContract(poolName, poolParams)
      // Upgrade proxy
      await proxyAdmin.connect(governor.signer).upgrade(proxy.address, newPool.address)
      pool = await ethers.getContractAt(poolName, proxy.address)
      expect(pool.address).to.be.eq(oldPool, 'Pool address via proxy should be same')

      const newPoolImpl = await proxyAdmin.getProxyImplementation(proxy.address)
      expect(newPoolImpl !== oldPoolImpl, 'Implementation address should be different').to.be.true

      const totalSupply2 = await pool.totalSupply()
      expect(totalSupply2).to.be.eq(totalSupply1, 'Total supply after upgrade should be same as before')

      // New deposit after upgrade
      await poolOps.deposit(pool, collateralToken, 10, user3)
      await strategy.rebalance()
      const totalValue = await pool.totalValue()
      const totalSupply3 = await pool.totalSupply()
      expect(totalSupply3).to.be.gt(totalSupply2, 'Total supply should increase')
      // User 1 withdraw
      await pool.connect(user1.signer).withdraw(await pool.balanceOf(user1.address))
      const totalSupply4 = await pool.totalSupply()
      expect(await pool.balanceOf(user1.address)).to.be.eq(0, 'user1 vBalance should be zero')
      expect(totalSupply4).to.be.lt(totalSupply3, 'Total supply should decrease at withdraw')
      expect(await pool.totalValue()).to.be.lt(totalValue, 'Total value should decrease at withdraw')
    })

    describe('Upgrader', function () {
      let upgrader

      beforeEach(async function () {
        // Deploy upgrader
        upgrader = await deployContract('VPoolUpgrader', [MULTICALL])

        // Transfer proxy ownership to the upgrader
        await proxyAdmin.connect(governor.signer).changeProxyAdmin(proxy.address, upgrader.address)
      })

      it('Should upgrade in proxy via upgrader', async function () {
        const oldPoolImpl = await upgrader.getProxyImplementation(proxy.address)
        const oldPool = pool.address
        const newPool = await deployContract(poolName, poolParams)

        // Trigger upgrade
        await upgrader.connect(governor.signer).safeUpgrade(proxy.address, newPool.address)
  
        pool = await ethers.getContractAt(poolName, proxy.address)
        expect(pool.address).to.be.eq(oldPool, 'Pool address via proxy should be same')

        const newPoolImpl = await upgrader.getProxyImplementation(proxy.address)
        expect(newPoolImpl !== oldPoolImpl, 'Implementation address should be different').to.be.true
      })
  
      it('Should properly revert wrong upgrades via upgrader', async function () {
        // Trigger upgrade
        await expect(upgrader.connect(governor.signer).safeUpgrade(proxy.address, MULTICALL)).to.be.reverted
      })
    })
  })
})