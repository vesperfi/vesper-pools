'use strict'

const {shouldBehaveLikePool} = require('../behavior/vesper-pool-v3')
// const {shouldBehaveLikeStrategy} = require('./behavior/maker-strategy')
const {deposit} = require('../utils/poolOps')
const {setupVPool} = require('../utils/setupHelper')
const VDAI = artifacts.require('VDAI')
const {BN} = require('@openzeppelin/test-helpers')
const DECIMAL18 = new BN('1000000000000000000')
const INFINITE = DECIMAL18.mul(new BN('10000000000000000000000000'))
const CollateralManager = artifacts.require('CollateralManager')
const AaveStrategy = artifacts.require('AaveV2StrategyDAI')
// const AaveStrategyETH = artifacts.require('AaveStrategyETH')
const VETH = artifacts.require('VETH')
const VesperStrategy = artifacts.require('VesperMakerStrategyETH')

contract('VETH Pool', function (accounts) {
  let vDai, dai // vEth, strategy, weth
  const vDaiPoolObj = {}
  const interestFee = '1500' // 15%
  const [, user1] = accounts

  const strategyConfig = {interestFee, debtRatio: 9000, debtRatePerBlock: INFINITE, maxDebtPerRebalance: INFINITE}

  beforeEach(async function () {
    await setupVPool(vDaiPoolObj, {
      pool: VDAI,
      strategies: [{artifact: AaveStrategy, type: 'aave', config: strategyConfig}],
      feeCollector: accounts[9],
    })
    vDai = vDaiPoolObj.pool
    dai = await vDaiPoolObj.collateralToken
    await deposit(vDai, dai, 2, user1)
    // await vDai.rebalance()
    await setupVPool(this, {
      pool: VETH,
      strategies: [{artifact: VesperStrategy, type: 'vesperMaker', config: strategyConfig}],
      collateralManager: CollateralManager,
      feeCollector: accounts[9],
      vPool: vDai,
    })
    // this.newStrategy = AaveStrategyETH
    // vEth = this.pool
    // strategy = this.strategy
    // weth = this.collateralToken
  })

  shouldBehaveLikePool('vETH', 'WETH', accounts)

  // shouldBehaveLikeStrategy('vETH', 'WETH', 'vDai', accounts)

  // it('Should not allow to sweep vToken from pool and strategy', async function () {
    // await deposit(vEth, weth, 10, user1)
    // await vEth.rebalance()
    // let tx = strategy.sweepErc20(vDai.address)
    // await expectRevert(tx, 'not-allowed-to-sweep')
    // tx = vEth.sweepErc20(vDai.address)
    // await expectRevert(tx, 'Not allowed to sweep')
  // })
})
