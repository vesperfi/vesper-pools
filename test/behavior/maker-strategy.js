'use strict'

const {deposit, executeIfExist, timeTravel} = require('../utils/poolOps')
const {expect} = require('chai')
const {ethers} = require('hardhat')
const {BigNumber: BN} = require('ethers')
const {getUsers, deployContract} = require('../utils/setupHelper')
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

  describe('MakerStrategy specific tests', function () {
    beforeEach(async function () {
      ;[gov, user1, user2] = await getUsers()
      pool = this.pool
      strategy = this.strategies[strategyIndex].instance
      strategyName = this.strategies[strategyIndex].name
      collateralToken = this.collateralToken
      token = this.strategies[strategyIndex].token
      isUnderwater = await strategy.isUnderwater()
      cm = strategy.collateralManager
      vaultNum = await strategy.vaultNum()
      // Decimal will be used for amount conversion
      collateralDecimal = await this.collateralToken.decimals()
      swapManager = await deployContract('SwapManager')
    })

    describe('Resurface', function () {
      it('Should resurface only when pool is underwater ', async function () {
        if (isUnderwater) {
          await expect(strategy.resurface()).to.not.reverted
        }
        await expect(strategy.resurface()).to.be.revertedWith('pool-is-above-water')
      })
    })

    describe('Deposit scenario', function () {
      it('Should deposit and rebalance', async function () {
        const depositAmount = await deposit(pool, collateralToken, 10, user1)
        const depositAmount18 = convertTo18(depositAmount)
        await strategy.rebalance()
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
        await strategy.rebalance()
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
        const vaultBeforeMigration = await cm.vaultNum(strategy.address)

        await pool.connect(gov.signer).migrateStrategy(strategy.address, newStrategy.address)

        const vaultAfterMigration = await cm.vaultNum(newStrategy.address)
        expect(vaultNum).to.be.equal(vaultBeforeMigration, 'vault number should match for strategy and cm.')
        expect(vaultAfterMigration).to.be.equal(vaultBeforeMigration, 'vault number should be same')

        const vaultWithOldStrategy = await cm.vaultNum(strategy.address)
        expect(vaultWithOldStrategy).to.be.equal(0, 'Old strategy should not own vault.')
      })

      it('Should have new strategy as owner of the vault.', async function () {
        const vaultInfoBefore = await cm.getVaultInfo(strategy.address)
        const newStrategy = await deployContract(strategyName, [pool.address, cm.address, swapManager.address])

        await pool.connect(gov.signer).migrateStrategy(strategy.address, newStrategy.address)
        await expect(cm.getVaultInfo(strategy.address)).to.be.revertedWith('invalid-vault-number')

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
        await strategy.rebalance()
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
        await strategy.rebalance()
        await executeIfExist(token.exchangeRateCurrent)

        await pool.connect(user1.signer).withdraw(withdrawAmount)
        const vaultInfo = await cm.getVaultInfo(strategy.address)
        const balance = await collateralToken.balanceOf(user1.address)

        expect(balance).to.be.equal(convertFrom18(withdrawAmount), 'Collateral balance is wrong')
        expect(vaultInfo.daiDebt).to.be.equal('0', 'Dai debt should be zero')
      })
    })

    describe('Earning scenario', function () {
      beforeEach(async function () {
        await deposit(pool, collateralToken, 20, user1)
        await strategy.rebalance()
      })
      it('Should report earning on rebalance', async function () {
        const tokensHere = await pool.tokensHere()
        // Time travel trigger some earning
        await timeTravel()
        await executeIfExist(token.exchangeRateCurrent)
        await strategy.rebalance()

        const tokensHereAfter = await pool.tokensHere()
        expect(tokensHereAfter).to.be.gt(tokensHere, 'Collateral token in pool should increase')
      })

      describe('Interest fee calculation via Jug Drip', function () {
        it('Should earn interest fee on earned amount', async function () {
          // TODO
        })
      })

      it('Should report earning on rebalance based on daiBalance and vault debt', async function () {
        // TODO
      })

      it('Should report loss in rebalance in underwater situation', async function () {
        // TODO
      })

      it('Should bring the pool above water on resurface', async function () {
        // TODO
      })
    })
  })
}

module.exports = {shouldBehaveLikeMakerStrategy}
