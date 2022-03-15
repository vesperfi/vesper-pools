'use strict'

const { deposit, timeTravel, rebalanceStrategy, rebalance } = require('../utils/poolOps')
const { expect } = require('chai')
const { ethers } = require('hardhat')
const hre = require('hardhat')
const { BigNumber: BN } = require('ethers')
const { getUsers, unlock } = require('../utils/setupHelper')

async function shouldBehaveLikeUnderlyingVesperPoolStrategy(strategyIndex) {
  let pool, strategy
  let collateralToken
  let user1, user2

  async function executeIfExist(fn, param) {
    if (typeof fn === 'function') {
      await fn(param)
    }
  }

  describe(`Underlying Vesper pool strategy specific tests[${strategyIndex}]`, function () {
    beforeEach(async function () {
      ;[, user1, user2] = await getUsers()
      pool = this.pool
      strategy = this.strategies[strategyIndex]
      collateralToken = this.collateralToken
    })

    describe('whitelisted withdraw', function () {
      beforeEach(async function () {
        await deposit(pool, collateralToken, 20, user1)
        await rebalanceStrategy(strategy)
      })

      it('Should not pay withdraw fee to underlying Vesper pool', async function () {
        await deposit(pool, collateralToken, 40, user2)
        await rebalance(this.strategies)
        const vDai = await ethers.getContractAt('VPool', await strategy.instance.receiptToken())
        const fc = '0xdba93b57e7223506717040f45d1ca3df5f30b275'
        const governor = await vDai.governor()
        const signer = await unlock(governor)
        const amount = BN.from(10).mul(BN.from('1000000000000000000'))
        await hre.network.provider.send('hardhat_setBalance', [governor, amount.toHexString()])
        await executeIfExist(vDai.connect(signer).updateFeeCollector, fc)
        await executeIfExist(vDai.connect(signer).updateWithdrawFee, '2000')
        const tokenBalanceBefore = await vDai.balanceOf(fc)
        await timeTravel(10 * 24 * 60 * 60)
        await rebalance(this.strategies)
        const tokenBalanceAfter = await vDai.balanceOf(fc)
        expect(tokenBalanceAfter).to.be.eq(
          tokenBalanceBefore,
          'Strategy not setup correctly. Should not pay withdraw fee',
        )
      })
    })
  })
}

module.exports = { shouldBehaveLikeUnderlyingVesperPoolStrategy }
