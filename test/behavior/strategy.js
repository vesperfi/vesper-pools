'use strict'

const {ethers} = require('hardhat')
const {expect} = require('chai')
const {constants} = require('@openzeppelin/test-helpers')
const {getUsers, getEvent} = require('../utils/setupHelper')
const {shouldBehaveLikeAaveStrategy} = require('../behavior/aave-strategy')
const {shouldBehaveLikeCompoundStrategy} = require('../behavior/compound-strategy')
const {shouldBehaveLikeMakerStrategy} = require('../behavior/maker-strategy')
const {shouldBehaveLikeCreamStrategy} = require('../behavior/cream-strategy')

const swapper = require('../utils/tokenSwapper')
const {deposit, rebalanceStrategy} = require('../utils/poolOps')
const {advanceBlock} = require('../utils/time')
const StrategyType = require('../utils/strategyTypes')
const addressListFactory = '0xded8217De022706A191eE7Ee0Dc9df1185Fb5dA3'
function shouldBehaveLikeStrategy(strategyIndex, type, strategyName) {
  let owner, user1, user2, user3, user4, user5, strategy, pool, feeCollector, collateralToken

  const behaviors = {
    [StrategyType.AAVE]: shouldBehaveLikeAaveStrategy,
    [StrategyType.COMPOUND]: shouldBehaveLikeCompoundStrategy,
    [StrategyType.AAVE_MAKER]: shouldBehaveLikeMakerStrategy,
    [StrategyType.COMPOUND_MAKER]: shouldBehaveLikeMakerStrategy,
    [StrategyType.CREAM]: shouldBehaveLikeCreamStrategy,
  }

  const metAddress = '0xa3d58c4e56fedcae3a7c43a725aee9a71f0ece4e'
  const shouldBehaveLikeSpecificStrategy = behaviors[type]

  describe(`${strategyName} Strategy common behaviour tests`, function () {
    beforeEach(async function () {
      const users = await getUsers()
      ;[owner, user1, user2, user3, user4, user5] = users
      strategy = this.strategies[strategyIndex].instance
      pool = this.pool
      collateralToken = this.collateralToken
      feeCollector = this.strategies[strategyIndex].feeCollector
    })
    describe('Initialize strategy', function () {
      it('Should not re-initialize strategy', async function () {
        await expect(strategy.init(addressListFactory)).to.be.revertedWith('keeper-list-already-created')
      })

      it('Should not re-initialize without governor role', async function () {
        await expect(strategy.connect(user2.signer).init(addressListFactory)).to.be.revertedWith(
          'caller-is-not-the-governor'
        )
      })
    })

    describe('Swap token', function () {
      it('Should sweep erc20 token', async function () {
        const token = await ethers.getContractAt('ERC20', metAddress)

        const tokenBalance = await swapper.swapEthForToken(1, metAddress, user1, strategy.address)
        await strategy.sweepERC20(metAddress)

        const metBalanceFeeCollector = await token.balanceOf(feeCollector)
        expect(metBalanceFeeCollector).to.be.equal(tokenBalance, 'ERC20 token balance is wrong')
      })

      it('Should not swap collateral token', async function () {
        await expect(strategy.sweepERC20(collateralToken.address)).to.be.revertedWith('not-allowed-to-sweep-collateral')
      })

      it('Should not swap reserved token', async function () {
        const reservedToken = await strategy.token()
        await expect(strategy.sweepERC20(reservedToken)).to.be.revertedWith('not-allowed-to-sweep')
      })
    })

    describe('Keeper List', function () {
      let keeperList, addressList

      beforeEach(async function () {
        keeperList = await strategy.keepers()
        expect(keeperList).to.not.equal(constants.ZERO_ADDRESS, 'List creation failed')
        addressList = await ethers.getContractAt('IAddressList', keeperList)
      })

      it('Should add a new keeper', async function () {
        expect(await addressList.length()).to.be.equal('1', 'Owner present in keeper list')
        await strategy.addKeeper(user2.address)
        expect(await addressList.length()).to.be.equal('2', 'Keeper added successfully')
      })

      it('Should revert if keeper address already exist in list', async function () {
        await strategy.addKeeper(user2.address)
        await expect(strategy.addKeeper(user2.address)).to.be.revertedWith('add-keeper-failed')
        await expect(strategy.addKeeper(owner.address)).to.be.revertedWith('add-keeper-failed')
      })

      it('Should revert if non-gov user add a keeper', async function () {
        await expect(strategy.connect(user2.signer).addKeeper(user3.address)).to.be.revertedWith(
          'caller-is-not-the-governor'
        )
      })

      it('Should remove a new keeper', async function () {
        await strategy.addKeeper(user2.address)
        await strategy.removeKeeper(user2.address)
        expect(await addressList.length()).to.be.equal('1', 'Keeper removed successfully')
      })

      it('Should revert if keeper address not exist in list', async function () {
        await expect(strategy.removeKeeper(user2.address)).to.be.revertedWith('remove-keeper-failed')
      })

      it('Should revert if non-gov user remove a keeper', async function () {
        await expect(strategy.connect(user2.signer).removeKeeper(user3.address)).to.be.revertedWith(
          'caller-is-not-the-governor'
        )
      })
    })

    describe('Fee collector', function () {
      it('Should revert if fee collector is zero', async function () {
        await expect(strategy.updateFeeCollector(constants.ZERO_ADDRESS)).to.be.revertedWith(
          'fee-collector-address-is-zero'
        )
      })

      it('Should revert if fee collector is same', async function () {
        await expect(strategy.updateFeeCollector(feeCollector)).to.be.revertedWith('fee-collector-is-same')
      })

      it('Should update fee collector', async function () {
        await expect(strategy.updateFeeCollector(user5.address))
          .to.emit(strategy, 'UpdatedFeeCollector')
          .withArgs(feeCollector, user5.address)
      })
    })

    describe('New strategy migration', function () {
      it('Should revert if caller is not vesper pool', async function () {
        await expect(strategy.migrate(metAddress)).to.be.revertedWith('caller-is-not-vesper-pool')
      })
    })

    describe('Total token value', function () {
      it('Should get initial total tokens', async function () {
        const initialTotalValue = await strategy.totalValue()
        expect(initialTotalValue).to.be.equal('0', 'Initial total tokens value should be zero')
      })

      it('Should not change total value on collateral token deposit', async function () {
        deposit(pool, collateralToken, 1, user1)
        const totalValue = await strategy.totalValue()
        expect(totalValue).to.be.equal('0', 'Total tokens should be zero')
      })
    })

    describe('Rebalance', function () {
      it('Should revert if rebalance called from non keeper', async function () {
        await expect(strategy.connect(user4.signer).rebalance()).to.be.revertedWith('caller-is-not-a-keeper')
      })

      it('Should have same total value and total debt without rebalance', async function () {
        await deposit(pool, collateralToken, 1, user1)
        const totalDebtBefore = (await pool.strategy(strategy.address)).totalDebt
        expect(await strategy.totalValue()).to.be.equal(totalDebtBefore, 'Total value should be same as total debt')
      })

      it('Should increase total value after rebalance', async function () {
        await rebalanceStrategy(this.strategies[strategyIndex]) // rebalance to handle under water
        await deposit(pool, collateralToken, 1, user1)
        const totalValueBefore = await strategy.totalValue()
        const totalDebtBefore = (await pool.strategy(strategy.address)).totalDebt
        expect(totalValueBefore).to.be.equal(totalDebtBefore, 'Total value should be same as total debt')
        await strategy.rebalance()
        await advanceBlock(50)
        expect(await strategy.totalValue()).to.be.gt(totalValueBefore, 'Total value should increase')
      })

      it('Should generate EarningReported event', async function () {
        await rebalanceStrategy(this.strategies[strategyIndex]) // rebalance to handle under water
        await deposit(pool, collateralToken, 50, user2) // deposit 50 ETH to generate some profit
        await strategy.rebalance()
        await advanceBlock(50)
        const txnObj = await strategy.rebalance()
        const event = await getEvent(txnObj, pool, 'EarningReported')
        expect(event.profit).to.be.gt(0, 'Should have some profit')
        expect(event.loss).to.be.gte(0, 'Should have some loss')
        expect(event.profit).to.be.gt(event.loss, 'Should have profit > loss')
        expect(event.payback).to.be.equal(0, 'Should have 0 payback')
        expect(event.poolDebt).to.be.equal(event.strategyDebt, 'Should have same strategyDebt and poolDebt')
      })
    })

    describe('Tokens Reserved/Receipt', function () {
      it('Should get receipt token', async function () {
        expect(await strategy.token()).to.not.equal(constants.ZERO_ADDRESS, 'Receipt token not found')
      })
      it('Should get receipt token not same as pool token', async function () {
        expect(await strategy.token()).to.not.equal(await pool.token(), 'Receipt token not same as pool token')
      })
      it('Should get strategy token as reserve token', async function () {
        expect(await strategy.isReservedToken(strategy.token())).to.be.equal(true, 'Strategy token is reserved')
      })
      it('Should not get pool token as reserve token', async function () {
        expect(await strategy.isReservedToken(pool.token())).to.be.equal(false, 'Pool token is not reserved')
      })
      it('Should not get other tokens as reserve token', async function () {
        expect(await strategy.isReservedToken(metAddress)).to.be.equal(false, 'Other token is not reserved')
      })
    })

    describe('Only pool can call withdraw', function () {
      it('Should not be able to withdraw from pool', async function () {
        await expect(strategy.withdraw(1)).to.be.revertedWith('caller-is-not-vesper-pool')
      })
    })

    describe('Approve token', function () {
      it('Should revert if called from non keeper', async function () {
        await expect(strategy.connect(user4.signer).approveToken()).to.be.revertedWith('caller-is-not-a-keeper')
      })

      it('Should call approve tokens', async function () {
        await expect(strategy.approveToken()).to.not.reverted
      })
    })

    it('Should payback all debt when debt ratio in pool is set 0 for the strategy.', async function () {
      // TODO
    })
  })

  // Run strategy specific tets
  if (behaviors[type]) {
    shouldBehaveLikeSpecificStrategy(strategyIndex)
  }
}

module.exports = {shouldBehaveLikeStrategy}
