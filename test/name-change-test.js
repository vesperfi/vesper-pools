'use strict'
const { getUsers, unlock, deployContract } = require('./utils/setupHelper')
const { adjustBalance } = require('./utils/balance')
const { ethers } = require('hardhat')
const { VAUSDC } = require('../helper/avalanche/poolConfig')
const { expect } = require('chai')

/* eslint-disable no-console */
describe('Local to avalanche upgrade and name change tests', function () {
  const proxyAdminAddress = '0xB6D75A53442844e8F1eed35d7A65225c57B282EB'
  const poolProxyAddress = '0x13AECC59A88A65F02E053eEce29d743a952D6f1e' // vaUSDC
  const newName = 'vaUSDC.e Pool'
  const newSymbol = 'vaUSDC.e'

  const strategyAddress = '0xF2d1eF29da4eebD2EF7903DAA39eC1EBc3967e90'
  const governorAddress = '0x98ca142b7a7856375d665B58A64FB6D29b49eF1f'
  const keeperAddress = '0x76d266DFD3754f090488ae12F6Bd115cD7E77eBD'

  let proxyAdmin, poolImplementation
  let poolProxy, strategy, collateralToken, collateralDecimal
  let user1, governor, keeper

  beforeEach(async function () {
    const users = await getUsers()
    ;[, user1] = users
    proxyAdmin = await ethers.getContractAt('ProxyAdmin', proxyAdminAddress)
    poolImplementation = await deployContract(VAUSDC.contractName, VAUSDC.poolParams)
    poolProxy = await ethers.getContractAt('VPool', poolProxyAddress)
    strategy = await ethers.getContractAt('IStrategy', strategyAddress)
    collateralToken = await ethers.getContractAt('ERC20', await poolProxy.token())
    collateralDecimal = await collateralToken.decimals()
    governor = await unlock(governorAddress)
    keeper = await unlock(keeperAddress)
  })

  it('Should upgrade pool and update name and symbol', async function () {
    console.log('#####  Before upgrade #####')
    console.log('Pool version', await poolProxy.VERSION())
    console.log('Pool name and symbol::', await poolProxy.name(), await poolProxy.symbol())
    const pricePerShare = await poolProxy.pricePerShare()

    // Upgrading proxy
    await proxyAdmin.connect(governor).upgrade(poolProxyAddress, poolImplementation.address)

    const pricePerShareAfter = await poolProxy.pricePerShare()
    expect(pricePerShareAfter, 'Price per share should be same').to.eq(pricePerShare)

    console.log('\n#####  After upgrade #####')
    // Update name and symbol
    await poolProxy.connect(governor).updateNameAndSymbol(newName, newSymbol)
    console.log('Pool version', await poolProxy.VERSION())
    console.log('Pool name and symbol::', await poolProxy.name(), await poolProxy.symbol())
    expect(await poolProxy.name(), 'New name is not correct').to.eq(newName)
    expect(await poolProxy.symbol(), 'New symbol is not correct').to.eq(newSymbol)
    // Deposit 30 DAI
    const depositAmount = ethers.utils.parseUnits('30', collateralDecimal)
    await adjustBalance(collateralToken.address, user1.address, depositAmount)
    await collateralToken.connect(user1.signer).approve(poolProxy.address, depositAmount)
    await poolProxy.connect(user1.signer).deposit(depositAmount)
    const vPoolBalance = await poolProxy.balanceOf(user1.address)
    expect(vPoolBalance, 'VPool balance of user should be > 0').to.gt('0')
    // Rebalance
    await strategy.connect(keeper).rebalance()
    // For simplicity set withdraw fee to zero
    await poolProxy.connect(governor).updateWithdrawFee(0)
    // Withdraw
    await poolProxy.connect(user1.signer).withdraw(vPoolBalance)
    const vPoolBalance2 = await poolProxy.balanceOf(user1.address)
    expect(vPoolBalance2, 'VPool balance of user should be zero').to.eq('0')
    expect(await collateralToken.balanceOf(user1.address), 'Collateral balance of user is wrong').to.gte(depositAmount)
  })
})
