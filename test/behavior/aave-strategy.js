'use strict'

const { expect } = require('chai')
const { getStrategyToken } = require('../utils/setupHelper')
const { deposit } = require('../utils/poolOps')
const Address = require('../../helper/mainnet/address')
const ZERO_ADDRESS = Address.ZERO
const time = require('../utils/time')
const { ethers } = require('hardhat')
const { adjustBalance } = require('../utils/balance')

const icAbi = ['function assets(address _aToken) external view returns(uint104, uint104, uint40)']
// Aave strategy specific tests
function shouldBehaveLikeAaveStrategy(strategyIndex) {
  let strategy, user2
  let pool, token, collateralToken

  describe('AaveStrategy specific tests', function () {
    beforeEach(async function () {
      ;[, , user2] = this.users
      strategy = this.strategies[strategyIndex].instance
      token = await getStrategyToken(this.strategies[strategyIndex])
      pool = this.pool
      collateralToken = this.collateralToken
    })

    it('Should increase totalValue due to aave rewards', async function () {
      // TODO remove address and emission check as we are mocking rewards on line 47
      const icAddress = await strategy.aaveIncentivesController()
      if (icAddress !== ZERO_ADDRESS) {
        const incentivesController = await ethers.getContractAt(icAbi, icAddress)
        const emissionPerSecond = (await incentivesController.assets(token.address))[0]
        if (emissionPerSecond.eq(0)) {
          // No rewards
          return
        }
        await deposit(pool, collateralToken, 10, user2)
        await strategy.rebalance()
        const totalValueBefore = await strategy.totalValue()
        const aTokenBefore = await token.balanceOf(strategy.address)
        expect(totalValueBefore).to.be.eq(aTokenBefore, 'Total value should be = aToken balance')
        // Time travel to earn some aave rewards
        await time.increase(5 * 24 * 60 * 60)
        // Send some stkAave to strategy to mock reward profit
        await adjustBalance(Address.Aave.stkAAVE, strategy.address, ethers.utils.parseEther('20'))
        const totalValueAfter = await strategy.totalValue()
        const aTokenAfter = await token.balanceOf(strategy.address)
        expect(aTokenAfter).to.be.gt(aTokenBefore, 'aToken balance after should be > aToken balance before')
        expect(totalValueAfter).to.be.gt(aTokenAfter, 'total value should be > aToken balance after')
      }
    })
  })
}

module.exports = { shouldBehaveLikeAaveStrategy }
