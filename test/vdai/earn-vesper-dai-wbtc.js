'use strict'

const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const { address: Address, strategyConfig } = require('../utils/chains').getChainData()
const { expect } = require('chai')
const { ethers } = require('hardhat')
const { getUsers } = require('../utils/setupHelper')
const { deposit, timeTravel, rebalanceStrategy } = require('../utils/poolOps')

describe('veDAI Pool with EarnVesperStrategyDAIWBTC', function () {
  const strategy1 = strategyConfig.EarnVesperStrategyDAIWBTC
  strategy1.config.debtRatio = 9000
  const strategies = [strategy1]
  prepareConfig(strategies, { growPool: { address: Address.vaWBTC } })

  describe('Pool Tests', function () {
    shouldBehaveLikePool('veDAI', 'DAI', true)
  })

  for (let i = 0; i < strategies.length; i++) {
    shouldBehaveLikeStrategy(i, strategies[i].type, strategies[i].contract)
  }

  describe('Multiple deposits from user', function () {
    let pool, strategy, collateralToken
    let user1, user2, user3
    beforeEach(async function () {
      ;[user1, user2, user3] = await getUsers()
      pool = this.pool
      strategy = this.strategies[0]
      collateralToken = this.collateralToken
    })
    it('Should allow multiple deposits even if claimable is zero', async function () {
      await deposit(pool, collateralToken, 20, user1)
      await rebalanceStrategy(strategy)
      await deposit(pool, collateralToken, 40, user2)
      await rebalanceStrategy(strategy)

      const EarnDrip = await ethers.getContractAt('IEarnDrip', await pool.poolRewards())
      await timeTravel(10 * 24 * 60 * 60)
      await rebalanceStrategy(strategy)

      // Testing scenario where Earn DAI to WBTC had an issue where drip amount was rounding to 0.
      // If new user tries to deposit 2 times, (this proper test setup, which this test has), 2nd fails
      // Deposit internally claim rewards too, hence it was fixed by updated claim logic in Earn drip
      await deposit(pool, collateralToken, 4, user3)
      await deposit(pool, collateralToken, 4, user3)
      await EarnDrip.updateReward(user1.address)
      const claimable2 = await EarnDrip.claimable(user3.address)
      // Verify that claimable is >= 0 which validate 2 deposits are successful and EarnDrip fix worked
      expect(claimable2._claimableAmounts[0], 'claimable should be >= 0').to.gte(0)
    })
  })
})
