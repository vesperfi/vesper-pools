'use strict'

const {deposit: _deposit, rebalance} = require('../utils/poolOps')
const {expect} = require('chai')
const {BN} = require('@openzeppelin/test-helpers')

async function shouldBehaveLikeMultiPool(poolName) {
  let pool, strategies, collateralToken
  let user1, user2

  async function deposit(amount, depositor) {
    return _deposit(pool, collateralToken, amount, depositor)
  }


  describe(`${poolName} multi-pool`, function () {
    beforeEach(async function () {
      ;[, user1, user2] = this.accounts
      // This setup helps in not typing 'this' all the time
      pool = this.pool
      strategies = this.strategies
      collateralToken = this.collateralToken
    })

    describe(`Should migrate ${poolName} pool from old strategy to new`, function () {
      it(`Should be able to migrate strategy successfully in ${poolName}`, async function () {
        await Promise.all([deposit(200, user2), deposit(200, user1)])
        await rebalance(strategies)
        const receiptToken = strategies[0].token
        const [
          totalSupplyBefore,
          totalValueBefore,
          totalDebtBefore,
          totalDebtRatioBefore,
          receiptTokenBefore,
        ] = await Promise.all([
          pool.totalSupply(),
          pool.totalValue(),
          pool.totalDebt(),
          pool.totalDebtRatio(),
          receiptToken.balanceOf(strategies[0].instance.address),
        ])
        // const
        const newStrategy = await strategies[0].artifact.new(pool.address)

        await pool.migrateStrategy(strategies[0].instance.address, newStrategy.address)

        const [
          totalSupplyAfter,
          totalValueAfter,
          totalDebtAfter,
          totalDebtRatioAfter,
          receiptTokenAfter,
          receiptTokenAfter2,
        ] = await Promise.all([
          pool.totalSupply(),
          pool.totalValue(),
          pool.totalDebt(),
          pool.totalDebtRatio(),
          receiptToken.balanceOf(strategies[0].instance.address),
          receiptToken.balanceOf(newStrategy.address),
        ])
        expect(totalSupplyAfter).to.be.bignumber.eq(
          totalSupplyBefore,
          `${poolName} total supply after migration is not correct`
        )
        expect(totalValueAfter).to.be.bignumber.eq(
          totalValueBefore,
          `${poolName} total value after migration is not correct`
        )
        expect(totalDebtAfter).to.be.bignumber.eq(
          totalDebtBefore,
          `${poolName} total debt after migration is not correct`
        )
        expect(totalDebtRatioAfter).to.be.bignumber.eq(
          totalDebtRatioBefore,
          `${poolName} total debt ratio after migration is not correct`
        )
        expect(receiptTokenAfter2).to.be.bignumber.gte(
          receiptTokenBefore,
          `${poolName} receipt  token balance of new strategy after migration is not correct`
        )
        expect(receiptTokenAfter).to.be.bignumber.eq(
          new BN('0'),
          `${poolName} receipt  token balance of new strategy after migration is not correct`
        )
      })
    })
  })
}

module.exports = {shouldBehaveLikeMultiPool}
