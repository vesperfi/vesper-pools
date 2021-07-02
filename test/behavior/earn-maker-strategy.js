'use strict'

const {deposit, executeIfExist, timeTravel, rebalanceStrategy} = require('../utils/poolOps')
const {expect} = require('chai')
const {ethers} = require('hardhat')
const {getUsers, deployContract} = require('../utils/setupHelper')
const Address = require('../../helper/ethereum/address')
const {shouldValidateMakerCommonBehaviour} = require('./maker-common')
async function shouldBehaveLikeEarnMakerStrategy(strategyIndex) {
  let pool, strategy
  let collateralToken, cm
  let user1, user2, earnDrip

  async function updateRate() {
    await executeIfExist(strategy.instance.token.exchangeRateCurrent)
    // Update rate using Jug drip
    const jugLike = await ethers.getContractAt('JugLike', '0x19c0976f590D67707E62397C87829d896Dc0f1F1')
    const vaultType = await strategy.instance.collateralType()
    await jugLike.drip(vaultType)
  }
  shouldValidateMakerCommonBehaviour(strategyIndex)
  describe(`MakerStrategy specific tests for strategy[${strategyIndex}]`, function () {
    beforeEach(async function () {
      ;[user1, user2] = await getUsers()
      pool = this.pool
      strategy = this.strategies[strategyIndex]
      collateralToken = this.collateralToken
      cm = strategy.instance.collateralManager
      // Decimal will be used for amount conversion
      const vesperEarnDripImpl = await deployContract('VesperEarnDrip', [])
      // Deploy proxy admin
      const proxyAdmin = await deployContract('ProxyAdmin', [])
      const initData = vesperEarnDripImpl.interface.encodeFunctionData('initialize', [pool.address, Address.DAI])
      // deploy proxy with logic implementation
      const proxy = await deployContract('TransparentUpgradeableProxy', [
        vesperEarnDripImpl.address,
        proxyAdmin.address,
        initData,
      ])
      // Get implementation from proxy
      earnDrip = await ethers.getContractAt('VesperEarnDrip', proxy.address)
      await pool.updatePoolRewards(proxy.address)
    })

    describe('Earning scenario', function () {
      beforeEach(async function () {
        await deposit(pool, collateralToken, 20, user1)
        await rebalanceStrategy(strategy)
      })

      describe('Interest fee calculation via Jug Drip', function () {
        it('Should earn interest fee', async function () {
          const dai = await ethers.getContractAt('ERC20', Address.DAI)
          const fc = await strategy.instance.feeCollector()
          const feeBalanceBefore = await dai.balanceOf(fc)
          await deposit(pool, collateralToken, 50, user2)
          await strategy.instance.rebalance()
          await timeTravel(5 * 24 * 60 * 60, 'compound')
          await strategy.instance.rebalance()
          const feeBalanceAfter = await dai.balanceOf(fc)
          expect(feeBalanceAfter).to.be.gt(feeBalanceBefore, 'Fee should increase')
        })
      })

      it('Should increase dai balance on rebalance', async function () {
        await deposit(pool, collateralToken, 40, user2)
        await strategy.instance.rebalance()
        const dai = await ethers.getContractAt('ERC20', Address.DAI)
        const tokenBalanceBefore = await dai.balanceOf(earnDrip.address)
        await timeTravel(10 * 24 * 60 * 60, 'compound')
        await strategy.instance.rebalance()
        const tokenBalanceAfter = await dai.balanceOf(earnDrip.address)
        expect(tokenBalanceAfter).to.be.gt(tokenBalanceBefore, 'Should increase dai balance in aave maker strategy')
        await timeTravel()
        const withdrawAmount = await pool.balanceOf(user2.address)
        await pool.connect(user2.signer).withdrawETH(withdrawAmount)
        const earnedDai = await dai.balanceOf(user2.address)
        expect(earnedDai).to.be.gt(0, 'No dai earned')
      })

      it('Should increase vault debt on rebalance', async function () {
        await deposit(pool, collateralToken, 50, user2)
        await strategy.instance.rebalance()
        const daiDebtBefore = await cm.getVaultDebt(strategy.instance.address)
        await timeTravel()
        await updateRate()
        await strategy.instance.rebalance()
        const daiDebtAfter = await cm.getVaultDebt(strategy.instance.address)
        expect(daiDebtAfter).to.be.gt(daiDebtBefore, 'Should increase vault debt on rebalance')
      })
    })
  })
}

module.exports = {shouldBehaveLikeEarnMakerStrategy}
