'use strict'

const {deposit, timeTravel, rebalanceStrategy} = require('../utils/poolOps')
const {expect} = require('chai')
const {ethers} = require('hardhat')
const {getUsers} = require('../utils/setupHelper')
const Address = require('../../helper/ethereum/address')
const {shouldValidateMakerCommonBehaviour} = require('./maker-common')
async function shouldBehaveLikeEarnVesperMakerStrategy(strategyIndex) {
  let pool, strategy
  let collateralToken
  let user1, user2

  shouldValidateMakerCommonBehaviour(strategyIndex)
  describe(`MakerStrategy specific tests for strategy[${strategyIndex}]`, function () {
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

      it('Should increase dai balance on rebalance', async function () {
        await deposit(pool, collateralToken, 40, user2)

        await strategy.instance.rebalance()
        const dai = await ethers.getContractAt('ERC20', Address.DAI)
        const poolRewards = await pool.poolRewards()

        const tokenBalanceBefore = await dai.balanceOf(poolRewards)
        await timeTravel(10 * 24 * 60 * 60)
        await strategy.instance.rebalance()

        const tokenBalanceAfter = await dai.balanceOf(poolRewards)
        expect(tokenBalanceAfter).to.be.gt(tokenBalanceBefore, 'Should increase dai balance')
        await timeTravel()
        const withdrawAmount = await pool.balanceOf(user2.address)
        await pool.connect(user2.signer).withdrawETH(withdrawAmount)

        const earnedDai = await dai.balanceOf(user2.address)
        expect(earnedDai).to.be.gt(0, 'No dai earned')
      })
    })
  })
}

module.exports = {shouldBehaveLikeEarnVesperMakerStrategy}
