'use strict'

const { deposit, executeIfExist, rebalanceStrategy } = require('../utils/poolOps')
const { expect } = require('chai')
const { ethers } = require('hardhat')
const { BigNumber: BN } = require('ethers')
const StrategyType = require('../utils/strategyTypes')
const PoolConfig = require('../../helper/ethereum/poolConfig')
const address = require('../../helper/ethereum/address')
const { getUsers, deployContract } = require('../utils/setupHelper')
const DECIMAL18 = BN.from('1000000000000000000')

function shouldValidateMakerCommonBehaviour(strategyIndex) {
  let pool, strategy, token, newStrategy
  let collateralToken, collateralDecimal, isUnderwater, cm, vaultNum, strategyName, swapManager
  let gov, user1, user2
  function convertTo18(amount) {
    const multiplier = DECIMAL18.div(BN.from('10').pow(collateralDecimal))
    return BN.from(amount).mul(multiplier)
  }

  function convertFrom18(amount) {
    const divisor = DECIMAL18.div(BN.from('10').pow(collateralDecimal))
    return BN.from(amount).div(divisor).toString()
  }

  describe(`MakerStrategy specific tests for strategy[${strategyIndex}]`, function () {
    beforeEach(async function () {
      ;[gov, user1, user2] = await getUsers()
      pool = this.pool
      strategy = this.strategies[strategyIndex]
      strategyName = this.strategies[strategyIndex].name
      collateralToken = this.collateralToken
      token = this.strategies[strategyIndex].token
      isUnderwater = await strategy.instance.isUnderwater()
      cm = strategy.instance.collateralManager
      vaultNum = await strategy.instance.vaultNum()
      // Decimal will be used for amount conversion
      collateralDecimal = await this.collateralToken.decimals()
      swapManager = this.swapManager

      // New Maker Strategy
      if (strategy.type === StrategyType.VESPER_MAKER) {
        // Setup vPool (vDAI)
        const vPool = await deployContract(PoolConfig.VDAI.contractName, PoolConfig.VDAI.poolParams)
        const accountant = await deployContract('PoolAccountant')
        await accountant.init(vPool.address)
        await vPool.initialize(...PoolConfig.VDAI.poolParams, accountant.address, address.ADDRESS_LIST_FACTORY)
        newStrategy = await deployContract(strategyName, [pool.address, cm.address, swapManager.address, vPool.address])
      }
      if (strategy.type === StrategyType.EARN_VESPER_MAKER) {
        // Setup vPool (vDAI)
        const vPool = await deployContract(PoolConfig.VDAI.contractName, PoolConfig.VDAI.poolParams)
        const accountant = await deployContract('PoolAccountant')
        await accountant.init(vPool.address)
        await vPool.initialize(...PoolConfig.VDAI.poolParams, accountant.address, address.ADDRESS_LIST_FACTORY)
        const vesperEarnDripImpl = await deployContract('VesperEarnDrip', [])
        // Deploy proxy admin
        const proxyAdmin = await deployContract('ProxyAdmin', [])
        const initData = vesperEarnDripImpl.interface.encodeFunctionData('initialize', [
          this.pool.address,
          [vPool.address],
        ])
        // deploy proxy with logic implementation
        const proxy = await deployContract('TransparentUpgradeableProxy', [
          vesperEarnDripImpl.address,
          proxyAdmin.address,
          initData,
        ])
        // Get implementation from proxy
        const earnDrip = await ethers.getContractAt('VesperEarnDrip', proxy.address)
        await earnDrip.updateGrowToken(vPool.address)
        await this.pool.updatePoolRewards(proxy.address)
        newStrategy = await deployContract(strategyName, [pool.address, cm.address, swapManager.address, vPool.address])
      } else {
        newStrategy = await deployContract(strategyName, [pool.address, cm.address, swapManager.address])
      }
    })

    describe('Resurface', function () {
      it('Should resurface only when pool is underwater ', async function () {
        if (isUnderwater) {
          await expect(strategy.instance.resurface()).to.not.reverted
        }
        await expect(strategy.instance.resurface()).to.be.revertedWith('pool-is-above-water')
      })

      it('Should bring the pool above water on resurface', async function () {
        if (isUnderwater) {
          await expect(strategy.instance.resurface()).to.not.reverted
          await expect(strategy.instance.isUnderwater()).to.be.true
        }
      })
    })

    describe('Deposit scenario', function () {
      it('Should deposit and rebalance', async function () {
        const depositAmount = await deposit(pool, collateralToken, 10, user1)
        const depositAmount18 = convertTo18(depositAmount)
        await rebalanceStrategy(strategy)
        return Promise.all([pool.totalSupply(), pool.totalValue(), pool.balanceOf(user1.address)]).then(function ([
          totalSupply,
          totalValue,
          vPoolBalance,
        ]) {
          expect(totalSupply).to.be.equal(depositAmount18, 'Total pool supply is wrong')
          expect(totalValue).to.be.equal(depositAmount, 'Total pool value is wrong')
          expect(vPoolBalance).to.be.equal(depositAmount18, 'pool balance of user is wrong')
        })
      })

      it('Should deposit via fallback and rebalance', async function () {
        // Skips this test in case collateral is not ETH/WETH
        if (collateralToken.address !== address.WETH) return true
        const depositAmount = 10
        await ethers.provider.send('eth_sendTransaction', [
          {
            from: user1.address,
            to: pool.address,
            value: ethers.utils.parseUnits(depositAmount.toString(), 'ether').toHexString(),
          },
        ])
        await rebalanceStrategy(strategy)
        return Promise.all([pool.totalSupply(), pool.totalValue(), pool.balanceOf(user1.address)]).then(function ([
          totalSupply,
          totalValue,
          vPoolBalance,
        ]) {
          expect(totalSupply).to.be.equal(DECIMAL18.mul(depositAmount), 'Total pool supply is wrong')
          expect(totalValue).to.be.equal(DECIMAL18.mul(depositAmount), 'Total pool value is wrong')
          expect(vPoolBalance).to.be.equal(DECIMAL18.mul(depositAmount), 'pool balance of user is wrong')
        })
      })
    })

    describe('Vault transfer', function () {
      it('Should not transfer vault ownership using any account.', async function () {
        await expect(cm.connect(user1.signer)['transferVaultOwnership(address)'](newStrategy.address)).to.be.reverted
      })

      it('Should transfer vault ownership on strategy migration', async function () {
        const vaultBeforeMigration = await cm.vaultNum(strategy.instance.address)

        await pool.connect(gov.signer).migrateStrategy(strategy.instance.address, newStrategy.address)

        const vaultAfterMigration = await cm.vaultNum(newStrategy.address)
        expect(vaultNum).to.be.equal(vaultBeforeMigration, 'vault number should match for strategy and cm.')
        expect(vaultAfterMigration).to.be.equal(vaultBeforeMigration, 'vault number should be same')

        const vaultWithOldStrategy = await cm.vaultNum(strategy.instance.address)
        expect(vaultWithOldStrategy).to.be.equal(0, 'Old strategy should not own vault.')
      })

      it('Should have new strategy as owner of the vault.', async function () {
        const vaultInfoBefore = await cm.getVaultInfo(strategy.instance.address)

        await pool.connect(gov.signer).migrateStrategy(strategy.instance.address, newStrategy.address)
        await expect(cm.getVaultInfo(strategy.instance.address)).to.be.revertedWith('invalid-vault-number')

        const vaultInfoAfter = await cm.getVaultInfo(newStrategy.address)
        expect(vaultInfoBefore.collateralLocked).to.be.equal(vaultInfoAfter.collateralLocked)
        expect(vaultInfoBefore.daiDebt).to.be.equal(vaultInfoAfter.daiDebt)
        expect(vaultInfoBefore.collateralUsdRate).to.be.equal(vaultInfoAfter.collateralUsdRate)
        expect(vaultInfoBefore.collateralRatio).to.be.equal(vaultInfoAfter.collateralRatio)
        expect(vaultInfoBefore.minimumDebt).to.be.equal(vaultInfoAfter.minimumDebt)
      })

      it('Should revert if collateral type is not the same', async function () {
        // given
        strategy = await deployContract('AaveMakerStrategyETH_A', [pool.address, cm.address, swapManager.address])
        newStrategy = await deployContract('AaveMakerStrategyETH_C', [pool.address, cm.address, swapManager.address])
        expect(await strategy.collateralType()).to.not.eq(await newStrategy.collateralType())

        const accountant = await ethers.getContractAt('PoolAccountant', await pool.poolAccountant())
        await accountant.addStrategy(strategy.address, 0, 100, ethers.constants.MaxUint256)

        // when
        const tx = pool.connect(gov.signer).migrateStrategy(strategy.address, newStrategy.address)

        // then
        await expect(tx).to.be.revertedWith('collateral-type-must-be-the-same')
      })
    })

    describe('Withdraw scenario', function () {
      it('Should withdraw after rebalance', async function () {
        await deposit(pool, collateralToken, 10, user2)
        await rebalanceStrategy(strategy)
        const balanceBefore =
          collateralToken.address === address.WETH
            ? await ethers.provider.getBalance(user2.address)
            : await collateralToken.balanceOf(user2.address)
        const withdrawAmount = await pool.balanceOf(user2.address)
        if (collateralToken.address === address.WETH) await pool.connect(user2.signer).withdrawETH(withdrawAmount)
        else await pool.connect(user2.signer).withdraw(withdrawAmount)

        const balanceAfter =
          collateralToken.address === address.WETH
            ? await ethers.provider.getBalance(user2.address)
            : await collateralToken.balanceOf(user2.address)
        return Promise.all([
          pool.totalDebt(),
          pool.totalSupply(),
          pool.totalValue(),
          pool.balanceOf(user2.address),
        ]).then(function ([totalDebt, totalSupply, totalValue, vPoolBalance]) {
          expect(totalDebt).to.be.equal('0', 'debt is wrong')
          expect(totalSupply).to.be.equal('0', 'Total supply is wrong')
          expect(totalValue).to.be.equal('0', 'Total value is wrong')
          expect(vPoolBalance).to.be.equal('0', 'balance of user is wrong')
          expect(balanceAfter).to.be.gt(balanceBefore, 'balance of user is wrong')
        })
      })

      it('Should pay back all debt if debt is below dust.', async function () {
        await deposit(pool, collateralToken, 20, user1)
        const withdrawAmount = (await pool.balanceOf(user1.address)).sub(BN.from('100')).toString()
        await rebalanceStrategy(strategy)
        await executeIfExist(token.exchangeRateCurrent)

        await pool.connect(user1.signer).withdraw(withdrawAmount)
        const vaultInfo = await cm.getVaultInfo(strategy.instance.address)
        const balance = await collateralToken.balanceOf(user1.address)

        expect(balance).to.be.equal(convertFrom18(withdrawAmount), 'Collateral balance is wrong')
        expect(vaultInfo.daiDebt).to.be.equal('0', 'Dai debt should be zero')
      })
    })
  })
}

module.exports = { shouldValidateMakerCommonBehaviour }
