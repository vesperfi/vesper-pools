'use strict'

const {expect} = require('chai')
const {ethers} = require('hardhat')
const poolOps = require('./utils/poolOps')
const {deployContract, getUsers, createStrategy} = require('./utils/setupHelper')
const StrategyType = require('./utils/strategyTypes')
const VDAI = require('./utils/poolConfig').VDAI

describe('Vesper Pool: proxy', function () {
  const poolName = VDAI.contractName
  const poolParams = VDAI.poolParams
  const addressListFactory = '0xded8217De022706A191eE7Ee0Dc9df1185Fb5dA3'
  let pool, strategy, collateralToken
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
    pool = await deployContract(poolName, poolParams)
    // Deploy proxy admin
    proxyAdmin = await deployContract('ProxyAdmin', [])
    // deploy accountant proxy with logic implementation
    const accountantProxy = await deployContract('TransparentUpgradeableProxy', [
      accountant.address,
      proxyAdmin.address,
      [],
    ])
    accountant = await ethers.getContractAt('PoolAccountant', accountantProxy.address)

    const initData = pool.interface.encodeFunctionData('initialize', [
      ...poolParams,
      accountantProxy.address,
      addressListFactory,
    ])
    // deploy pool proxy with logic implementation
    proxy = await deployContract('TransparentUpgradeableProxy', [pool.address, proxyAdmin.address, initData])
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
    it('Should upgrade pool and still have keep storage', async function () {
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
  })
})
