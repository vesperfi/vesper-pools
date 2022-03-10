'use strict'

const { expect } = require('chai')
const { prepareConfig } = require('./config')
const { shouldBehaveLikePool } = require('../behavior/vesper-pool')
const { shouldBehaveLikeStrategy } = require('../behavior/strategy')
const { deposit, timeTravel } = require('../utils/poolOps')
const { strategyConfig } = require('../utils/chains').getChainData()

describe('vaWBTC Pool with CrvsBTCStrategy', function () {
  const strategy1 = strategyConfig.CrvSBTCPoolStrategyWBTC
  strategy1.config.debtRatio = 10000
  const strategies = [strategy1]
  prepareConfig(strategies)

  describe('Pool Tests', function () {
    shouldBehaveLikePool('vaWBTC', 'WBTC')
  })

  describe('Strategy Tests', function () {
    shouldBehaveLikeStrategy(0, strategies[0].type, strategies[0].contract)
  })

  describe('CrvSBTCPoolStrategyWBTC: WBTC Functionality', function () {
    let pool, collateralToken, strategy, user1, user2, user3
    beforeEach(async function () {
      ;[, user1, user2, user3] = this.users
      pool = this.pool
      collateralToken = this.collateralToken
      strategy = this.strategies[0].instance
    })
    it('Should calculate fees properly and reflect those in share price', async function () {
      await deposit(pool, collateralToken, 20, user1)
      await strategy.rebalance()
      const price1 = await pool.pricePerShare()
      // Time travel to generate earning
      await timeTravel(30 * 24 * 60 * 60)
      await deposit(pool, collateralToken, 20, user2)
      await strategy.rebalance()
      const price2 = await pool.pricePerShare()
      expect(price2).to.be.gt(price1, 'Share value should increase (1)')
      // Time travel to generate earning
      await timeTravel(30 * 24 * 60 * 60)
      await deposit(pool, collateralToken, 20, user3)
      await timeTravel(30 * 24 * 60 * 60)
      await strategy.rebalance()
      const price3 = await pool.pricePerShare()
      expect(price3).to.be.gt(price2, 'Share value should increase (2)')
    })
  })
})
