'use strict'

const { expect } = require('chai')
const swapper = require('../utils/tokenSwapper')
const { getUsers } = require('../utils/setupHelper')
const { deposit } = require('../utils/poolOps')
const { advanceBlock } = require('../utils/time')
const { ethers } = require('hardhat')
const { getChain } = require('../utils/chains')
const Address = require(`../../helper/${getChain()}/address`)

const { CRV } = Address

// crv strategy specific tests
function shouldBehaveLikeCrvStrategy(strategyIndex) {
  let strategy, user1, user2, pool, collateralToken, crv
  describe('CurveStrategy specific tests', function () {
    beforeEach(async function () {
      const users = await getUsers()
      ;[user1, user2] = users
      pool = this.pool
      strategy = this.strategies[strategyIndex].instance
      collateralToken = this.collateralToken
      crv = await ethers.getContractAt('ERC20', CRV)
    })

    it('Verify convertFrom18 is implemented correctly', async function () {
      const DECIMAL18 = ethers.utils.parseUnits('1', 18)
      const collateralDecimal = await this.collateralToken.decimals()
      const expected = ethers.utils.parseUnits('1', collateralDecimal)
      const actual = await strategy.convertFrom18(DECIMAL18)
      expect(actual).to.be.equal(expected, 'Conversion from 18 is wrong')
    })

    it('Should get CRV token as reserve token', async function () {
      expect(await strategy.isReservedToken(CRV)).to.be.true
      const crvLP = await strategy.crvLp()
      expect(await strategy.isReservedToken(crvLP)).to.be.true
    })

    it('Should get total value', async function () {
      await deposit(pool, collateralToken, 1, user1)
      await strategy.rebalance()
      const totalValue = await strategy.totalValue()
      expect(totalValue).to.be.gt(0, 'Total tokens should be > zero')
    })

    // Note: Waiting clarification from Curve team to be able to simulate
    // multi-chain CRV reward distribution
    // Refs: https://curve.readthedocs.io/dao-gauges-sidechain.html
    if (getChain() === 'mainnet') {
      it('Should claim CRV when rebalance is called', async function () {
        await deposit(pool, collateralToken, 1, user1)
        await strategy.rebalance()
        await strategy.rebalance()
        await advanceBlock(1000)
        await strategy.setCheckpoint()
        const crvAccruedBefore = await strategy.estimateClaimableRewardsInCollateral()
        await strategy.rebalance()
        const crvAccruedAfter = await strategy.estimateClaimableRewardsInCollateral()
        expect(crvAccruedBefore).to.be.gt(0, 'crv accrued should be > 0 before rebalance')
        expect(crvAccruedAfter).to.be.equal(0, 'crv accrued should be 0 after rebalance')
      })
    }

    it('Should liquidate CRV when claimed by external source', async function () {
      await deposit(pool, collateralToken, 1, user1)
      await strategy.rebalance()
      await swapper.swapEthForToken(10, CRV, user2, strategy.address)
      const afterSwap = await crv.balanceOf(strategy.address)
      expect(afterSwap).to.be.gt(0, 'CRV balance should increase on strategy address')
      await strategy.rebalance()
      const crvBalance = await crv.balanceOf(strategy.address)
      expect(crvBalance).to.be.equal('0', 'CRV balance should be 0 on rebalance')
    })
  })
}

module.exports = { shouldBehaveLikeCrvStrategy }
