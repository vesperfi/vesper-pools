'use strict'

const { expect } = require('chai')
const swapper = require('../utils/tokenSwapper')
const { getUsers } = require('../utils/setupHelper')
const { deposit } = require('../utils/poolOps')
const { adjustBalance } = require('../utils/balance')
const { advanceBlock } = require('../utils/time')
const hre = require('hardhat')
const { ethers } = hre
const { BigNumber: BN } = require('ethers')
const address = require('../../helper/mainnet/address')
const { getChain } = require('../utils/chains')
const DECIMAL18 = BN.from('1000000000000000000')

// Compound strategy specific tests
function shouldBehaveLikeCompoundStrategy(strategyIndex) {
  let strategy, user1, user2, pool, collateralToken, token, comp, comptroller, collateralDecimal

  function convertFrom18(amount) {
    const divisor = DECIMAL18.div(BN.from('10').pow(collateralDecimal))
    return BN.from(amount).div(divisor).toString()
  }

  describe('CompoundStrategy specific tests', function () {
    beforeEach(async function () {
      const users = await getUsers()
      ;[user1, user2] = users
      pool = this.pool
      strategy = this.strategies[strategyIndex].instance
      collateralToken = this.collateralToken
      collateralDecimal = await this.collateralToken.decimals()
      token = this.strategies[strategyIndex].token
      comp = await ethers.getContractAt('ERC20', await strategy.rewardToken())
      comptroller = await ethers.getContractAt('Comptroller', await strategy.COMPTROLLER())
    })

    it('Should get rewardToken token as reserve token', async function () {
      expect(await strategy.isReservedToken(await strategy.rewardToken())).to.be.equal(
        true,
        'rewardToken token is reserved',
      )
    })

    it('Should get total value', async function () {
      await deposit(pool, collateralToken, 1, user1)
      await strategy.rebalance()
      const totalValue = await strategy.totalValue()
      expect(totalValue).to.be.gt(0, 'Total tokens should be > zero')
    })

    it('Should claim COMP when rebalance is called', async function () {
      if (getChain() === 'mainnet' && comptroller.address !== address.Drops.COMPTROLLER) {
        // compAccrued doesn't increment in Drops Finance,
        // deposits and withdraws automatically claim rewards
        // Reference: https://shorturl.at/luJKP
        await deposit(pool, collateralToken, 1, user1)
        await strategy.rebalance()
        await token.exchangeRateCurrent()
        await advanceBlock(100)
        const withdrawAmount = await pool.balanceOf(user1.address)
        // compAccrued is updated only when user do some activity. withdraw to trigger compAccrue update
        await pool.connect(user1.signer).withdraw(withdrawAmount)
        const compAccruedBefore = await comptroller.compAccrued(strategy.address)
        await strategy.rebalance()
        const compAccruedAfter = await comptroller.compAccrued(strategy.address)
        expect(compAccruedBefore).to.be.gt(0, 'comp accrued should be > 0 before rebalance')
        expect(compAccruedAfter).to.be.equal(0, 'comp accrued should be 0 after rebalance')
      }
    })

    it('Should liquidate COMP when claimed by external source', async function () {
      if (getChain() === 'mainnet') {
        await deposit(pool, collateralToken, 1, user1)
        await strategy.rebalance()
        await swapper.swapEthForToken(10, comp.address, user2, strategy.address)
        const afterSwap = await comp.balanceOf(strategy.address)
        expect(afterSwap).to.be.gt(0, 'COMP balance should increase on strategy address')
        await comptroller.claimComp(strategy.address, [token.address], { from: user1.address })
        const afterClaim = await comp.balanceOf(strategy.address)
        expect(afterClaim).to.be.gt(afterSwap, 'COMP balance increase after claim')
        await advanceBlock(100)
        await token.exchangeRateCurrent()
        await strategy.rebalance()
        const compBalance = await comp.balanceOf(strategy.address)
        expect(compBalance).to.be.equal('0', 'COMP balance should be 0 on rebalance')
      }
    })

    it('Should be able to withdraw amount when low liquidity for cETH', async function () {
      if (
        getChain() === 'mainnet' &&
        (token.address === address.Compound.cETH ||
          token.address === address.Inverse.anETH ||
          token.address === address.Drops.dETH)
      ) {
        const cToken = await ethers.getContractAt('CToken', token.address)
        await deposit(pool, collateralToken, 2000, user1)
        const wethBalanceBeforeWithdraw = await collateralToken.balanceOf(user1.address)
        const withdrawAmount = await pool.balanceOf(user1.address)
        await strategy.rebalance()
        const bufferInPool = await pool.tokensHere()
        const liquidityAmountInCompound = BN.from(30000000000000)
        await hre.network.provider.send('hardhat_setBalance', [cToken.address, liquidityAmountInCompound.toHexString()])
        expect(await cToken.getCash()).to.be.equals(liquidityAmountInCompound)

        await pool.connect(user1.signer).withdraw(withdrawAmount)
        const wethBalanceAfterWithdraw = await collateralToken.balanceOf(user1.address)
        expect(wethBalanceAfterWithdraw.sub(wethBalanceBeforeWithdraw)).to.be.equal(
          bufferInPool.add(liquidityAmountInCompound),
          'incorrect amount withdraw on low liquidity for cETH',
        )
      }
    })

    it('Should be able to withdraw amount when low liquidity for ERC20 cToken', async function () {
      if (
        getChain() === 'mainnet' &&
        (token.address === address.Compound.cETH ||
          token.address === address.Inverse.anETH ||
          token.address === address.Drops.dETH)
      ) {
        const cToken = await ethers.getContractAt('CToken', token.address)
        const depositAmount = await swapper.swapEthForToken(10, collateralToken.address, user1)
        await collateralToken.connect(user1.signer).approve(pool.address, depositAmount)
        // deposit half of swapped amount in pool.
        await pool.connect(user1.signer).deposit(depositAmount.div(2))

        const tokenBalanceBeforeWithdraw = await collateralToken.balanceOf(user1.address)
        const withdrawAmount = await pool.balanceOf(user1.address)
        await strategy.rebalance()
        const bufferInPool = await pool.tokensHere()

        const amount = 30000000000000
        const liquidityAmountInCompound = BN.from(convertFrom18(amount))
        adjustBalance(collateralToken.address, cToken.address, liquidityAmountInCompound)
        expect(await cToken.getCash()).to.be.equals(liquidityAmountInCompound)

        await pool.connect(user1.signer).withdraw(withdrawAmount)
        const tokenBalanceAfterWithdraw = await collateralToken.balanceOf(user1.address)

        expect(tokenBalanceAfterWithdraw.sub(tokenBalanceBeforeWithdraw)).to.be.equal(
          bufferInPool.add(liquidityAmountInCompound),
          'incorrect amount withdraw on low liquidity for ERC20 cToken',
        )
      }
    })
  })
}

module.exports = { shouldBehaveLikeCompoundStrategy }
