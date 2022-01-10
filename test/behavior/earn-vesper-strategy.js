'use strict'

const { deposit, timeTravel, rebalanceStrategy } = require('../utils/poolOps')
const { expect } = require('chai')
const { ethers } = require('hardhat')
const { getUsers } = require('../utils/setupHelper')
const { getChain } = require('../utils/chains')
const Address = require(`../../helper/${getChain()}/address`)

const { shouldBehaveLikeUnderlyingVesperPoolStrategy } = require('./strategy-underlying-vesper-pool')

async function shouldBehaveLikeEarnVesperStrategy(strategyIndex) {
  let pool, strategy
  let collateralToken
  let user1, user2

  shouldBehaveLikeUnderlyingVesperPoolStrategy(strategyIndex)
  describe(`Earn Vesper specific tests for strategy[${strategyIndex}]`, function () {
    beforeEach(async function () {
      ;[user1, user2] = await getUsers()
      pool = this.pool
      strategy = this.strategies[strategyIndex]
      collateralToken = this.collateralToken
    })

    describe('Earning scenario', function () {
      beforeEach(async function () {
        await deposit(pool, collateralToken, 20, user1)
        await rebalanceStrategy(strategy)
      })

      it('Should increase drip balance on rebalance', async function () {
        await deposit(pool, collateralToken, 40, user2)

        await rebalanceStrategy(strategy)
        const dripToken = await ethers.getContractAt('ERC20', await strategy.instance.dripToken())
        const dripTokenSymbol = await dripToken.symbol()
        const earnedDripBefore =
          dripToken.address === Address.WETH
            ? await ethers.provider.getBalance(user2.address)
            : await dripToken.balanceOf(user2.address)

        const EarnDrip = await ethers.getContractAt('IEarnDrip', await pool.poolRewards())

        let rewardToken = await ethers.getContractAt('ERC20', await EarnDrip.growToken())
        if (rewardToken.address === ethers.constants.AddressZero) {
          rewardToken = dripToken
        }
        const rewardTokenSymbol = await rewardToken.symbol()

        const tokenBalanceBefore = await rewardToken.balanceOf(EarnDrip.address)
        const pricePerShareBefore = await pool.pricePerShare()

        await timeTravel(10 * 24 * 60 * 60)
        await rebalanceStrategy(strategy)

        // Earn drip has custom logic for claimable, so lets test it here
        await EarnDrip.updateReward(user1.address)
        const claimable = await EarnDrip.claimable(user1.address)
        expect(claimable._claimableAmounts[0]).to.gt(0, 'incorrect claimable')

        const tokenBalanceAfter = await rewardToken.balanceOf(EarnDrip.address)
        expect(tokenBalanceAfter).to.be.gt(
          tokenBalanceBefore,
          `Should increase ${rewardTokenSymbol} balance in EarnDrip`,
        )

        const pricePerShareAfter = await pool.pricePerShare()

        expect(pricePerShareBefore).to.be.eq(pricePerShareAfter, "Price per share of of EarnPool shouldn't increase")

        const withdrawAmount = await pool.balanceOf(user2.address)

        if (collateralToken.address === Address.WETH) await pool.connect(user2.signer).withdrawETH(withdrawAmount)
        else await pool.connect(user2.signer).withdraw(withdrawAmount)

        const earnedDrip =
          dripToken.address === Address.WETH
            ? await ethers.provider.getBalance(user2.address)
            : await dripToken.balanceOf(user2.address)

        expect(earnedDrip.sub(earnedDripBefore)).to.be.gt(0, `No ${dripTokenSymbol} earned`)
      })
    })
  })
}

module.exports = { shouldBehaveLikeEarnVesperStrategy }
