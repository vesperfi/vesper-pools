'use strict'

const {deposit, executeIfExist, timeTravel, rebalanceStrategy} = require('../utils/poolOps')
const {expect} = require('chai')
const {ethers} = require('hardhat')
const {BigNumber: BN} = require('ethers')
const {getUsers, deployContract, getEvent} = require('../utils/setupHelper')
const DECIMAL18 = BN.from('1000000000000000000')

function shouldBehaveLikeMakerStrategy(strategyIndex) {
  let pool, strategy, token
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

  async function updateRate() {
    await executeIfExist(strategy.instance.token.exchangeRateCurrent)
    // Update rate using Jug drip
    const jugLike = await ethers.getContractAt('JugLike', '0x19c0976f590D67707E62397C87829d896Dc0f1F1')
    const vaultType = await strategy.instance.collateralType()
    await jugLike.drip(vaultType)
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
        const newStrategy = await deployContract(strategyName, [pool.address, cm.address, swapManager.address])
        await expect(cm.connect(user1.signer)['transferVaultOwnership(address)'](newStrategy.address)).to.be.reverted
      })

      it('Should transfer vault ownership on strategy migration', async function () {
        const newStrategy = await deployContract(strategyName, [pool.address, cm.address, swapManager.address])
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
        const newStrategy = await deployContract(strategyName, [pool.address, cm.address, swapManager.address])

        await pool.connect(gov.signer).migrateStrategy(strategy.instance.address, newStrategy.address)
        await expect(cm.getVaultInfo(strategy.instance.address)).to.be.revertedWith('invalid-vault-number')

        const vaultInfoAfter = await cm.getVaultInfo(newStrategy.address)
        expect(vaultInfoBefore.collateralLocked).to.be.equal(vaultInfoAfter.collateralLocked)
        expect(vaultInfoBefore.daiDebt).to.be.equal(vaultInfoAfter.daiDebt)
        expect(vaultInfoBefore.collateralUsdRate).to.be.equal(vaultInfoAfter.collateralUsdRate)
        expect(vaultInfoBefore.collateralRatio).to.be.equal(vaultInfoAfter.collateralRatio)
        expect(vaultInfoBefore.minimumDebt).to.be.equal(vaultInfoAfter.minimumDebt)
      })
    })

    describe('Withdraw scenario', function () {
      it('Should withdraw after rebalance', async function () {
        await deposit(pool, collateralToken, 10, user2)
        await rebalanceStrategy(strategy)
        const balanceBefore = await ethers.provider.getBalance(user2.address)
        const withdrawAmount = await pool.balanceOf(user2.address)
        await pool.connect(user2.signer).withdrawETH(withdrawAmount)
        return Promise.all([
          pool.totalDebt(),
          pool.totalSupply(),
          pool.totalValue(),
          pool.balanceOf(user2.address),
          ethers.provider.getBalance(user2.address),
        ]).then(function ([totalDebt, totalSupply, totalValue, vPoolBalance, balanceAfter]) {
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

    describe('Earning scenario', function () {
      beforeEach(async function () {
        await deposit(pool, collateralToken, 20, user1)
        await rebalanceStrategy(strategy)
      })

      it('Should increase pool token on rebalance', async function () {
        const tokensHere = await pool.tokensHere()
        // Time travel trigger some earning
        await timeTravel()
        await executeIfExist(token.exchangeRateCurrent)
        await rebalanceStrategy(strategy)

        const tokensHereAfter = await pool.tokensHere()
        expect(tokensHereAfter).to.be.gt(tokensHere, 'Collateral token in pool should increase')
      })

      describe('Interest fee calculation via Jug Drip', function () {
        it('Should earn interest fee', async function () {
          const feeBalanceBefore = await pool.balanceOf(strategy.instance.address)
          const totalSupplyBefore = await pool.totalSupply()
          await deposit(pool, collateralToken, 50, user2)

          await rebalanceStrategy(strategy)
          await timeTravel()
          await updateRate()

          const feeBalanceAfter = await pool.balanceOf(strategy.instance.address)
          expect(feeBalanceAfter).to.be.gt(feeBalanceBefore, 'Fee should increase')

          const totalSupplyAfter = await pool.totalSupply()
          expect(totalSupplyAfter).to.be.gt(totalSupplyBefore, 'Total supply should increase')
        })
      })

      it('Should increase dai balance on rebalance', async function () {
        await deposit(pool, collateralToken, 40, user2)
        await rebalanceStrategy(strategy)
        const tokenBalanceBefore = await token.balanceOf(strategy.instance.address)
        await timeTravel()
        await updateRate()
        const txnObj = await rebalanceStrategy(strategy)
        const event = await getEvent(txnObj, pool, 'EarningReported')
        const tokenBalanceAfter = await token.balanceOf(strategy.instance.address)
        expect(event.profit).to.be.gt(0, 'Should have some profit')
        expect(event.loss).to.be.equal(0, 'Should have no loss')
        expect(tokenBalanceAfter).to.be.gt(tokenBalanceBefore, 'Should increase dai balance in aave maker strategy')
      })

      it('Should increase vault debt on rebalance', async function () {
        await deposit(pool, collateralToken, 50, user2)
        await rebalanceStrategy(strategy)
        const daiDebtBefore = await cm.getVaultDebt(strategy.instance.address)
        await timeTravel()
        await updateRate()
        await rebalanceStrategy(strategy)
        const daiDebtAfter = await cm.getVaultDebt(strategy.instance.address)
        expect(daiDebtAfter).to.be.gt(daiDebtBefore, 'Should increase vault debt on rebalance')
      })

      it('Should report loss in rebalance in underwater situation', async function () {
        // TODO
      })
    })
  })
}

module.exports = {shouldBehaveLikeMakerStrategy}
