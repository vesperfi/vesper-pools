'use strict'
const { getUsers, unlock, deployContract } = require('./utils/setupHelper')
const { adjustBalance } = require('./utils/balance')
const { ethers } = require('hardhat')
const { VADAI } = require('../helper/mainnet/poolConfig')
const parse = require('./utils/prettyPrint')
const { expect } = require('chai')

describe('Local to mainnet upgrade tests', function () {
  const proxyAdminAddress = '0x19A02f3512BdF78114B3c50f7d22a34b1B2798cA'
  const poolProxyAddress = '0x0538C8bAc84E95A9dF8aC10Aad17DbE81b9E36ee' // vaDAI
  const accountantProxyAddress = '0x2337c59180357cE1d771Da2B2dF56A91e7c442c0'

  const strategyAddress = '0xBD5862Ae6C6f98ac2aaAd83A26D58744c1250C10'
  const feeCollector = '0x80d426D65D926dF121dc58C18D043B73e998CE2b'
  const governorAddress = '0x9520b477Aa81180E6DdC006Fc09Fb6d3eb4e807A'
  const keeperAddress = '0xdf826ff6518e609E4cEE86299d40611C148099d5'

  let proxyAdmin, poolImplementation, accountantImplementation
  let poolProxy, strategy, collateralToken, collateralDecimal
  let user1, governor, keeper

  const abi = [
    'function deposit(uint256 _amount) external',
    'function pricePerShare() external view returns(uint256)',
    `function strategy(address _strategy) external view returns (
      bool _active,
      uint256 _interestFee,
      uint256 _debtRate,
      uint256 _lastRebalance,
      uint256 _totalDebt,
      uint256 _totalLoss,
      uint256 _totalProfit,
      uint256 _debtRatio)`,
    'function token() external view returns(address)',
    'function VERSION() external view returns(string memory)',
    'function withdraw(uint256 _amount) external',
  ]

  beforeEach(async function () {
    const users = await getUsers()
    ;[, user1] = users
    proxyAdmin = await ethers.getContractAt('ProxyAdmin', proxyAdminAddress)
    poolImplementation = await deployContract(VADAI.contractName, VADAI.poolParams)
    accountantImplementation = await deployContract('PoolAccountant')
    poolProxy = await ethers.getContractAt(abi, poolProxyAddress)
    strategy = await ethers.getContractAt('IStrategy', strategyAddress)
    collateralToken = await ethers.getContractAt('ERC20', await poolProxy.token())
    collateralDecimal = await collateralToken.decimals()
    governor = await unlock(governorAddress)
    keeper = await unlock(keeperAddress)
  })

  it('Should upgrade pool and accountant', async function () {
    // console.log('#####  Before upgrade #####')
    // console.log('Pool version', await poolProxy.VERSION())
    const pricePerShare = await poolProxy.pricePerShare()
    // console.log('strategy config')
    // parse(await poolProxy.strategy(strategyAddress))

    // Upgrading proxy
    await proxyAdmin.connect(governor).upgrade(accountantProxyAddress, accountantImplementation.address)
    await proxyAdmin.connect(governor).upgrade(poolProxyAddress, poolImplementation.address)
    poolProxy = await ethers.getContractAt('VPool', poolProxyAddress)
    // console.log('\n#####  After upgrade #####')
    // console.log('Pool version', await poolProxy.VERSION())
    const pricePerShareAfter = await poolProxy.pricePerShare()
    expect(pricePerShareAfter, 'Price per share should be same').to.eq(pricePerShare)
    parse(await poolProxy.strategy(strategyAddress))

    // updating fee
    await poolProxy.connect(governor).updateUniversalFee(200)
    await poolProxy.connect(governor).updateMaximumProfitAsFee(5000)

    // Deposit 30 DAI
    const depositAmount = ethers.utils.parseUnits('30', collateralDecimal)
    await adjustBalance(collateralToken.address, user1.address, depositAmount)
    await collateralToken.connect(user1.signer).approve(poolProxy.address, depositAmount)
    await poolProxy.connect(user1.signer).deposit(depositAmount)
    const vPoolBalance = await poolProxy.balanceOf(user1.address)
    expect(vPoolBalance, 'VPool balance of user should be > 0').to.gt('0')

    const vPoolStrategy = await poolProxy.balanceOf(strategyAddress)
    const vPoolFC = await poolProxy.balanceOf(feeCollector)
    await strategy.connect(keeper).rebalance()
    // console.log('Strategy config after rebalance, notice lastRebalance timestamp')
    // parse(await poolProxy.strategy(strategyAddress))

    const vPoolStrategy2 = await poolProxy.balanceOf(strategyAddress)
    expect(vPoolStrategy2, 'VPool balance of strategy should be same').to.eq(vPoolStrategy)
    const vPoolFC2 = await poolProxy.balanceOf(feeCollector)
    expect(vPoolFC2, 'VPool balance of feeCollector should be >=').to.gte(vPoolFC)

    await poolProxy.connect(user1.signer).withdraw(vPoolBalance)
    const vPoolBalance2 = await poolProxy.balanceOf(user1.address)
    expect(vPoolBalance2, 'VPool balance of user should be zero').to.eq('0')
    expect(await collateralToken.balanceOf(user1.address), 'Collateral balance of user is wrong').to.gte(depositAmount)
  })
})
