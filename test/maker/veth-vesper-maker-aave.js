'use strict'

const {shouldBehaveLikePool} = require('../behavior/vesper-pool')
const {shouldBehaveLikeStrategy} = require('../behavior/maker-strategy')
const {deposit} = require('../utils/poolOps')
const {setupVPool} = require('../utils/setupHelper')
const StrategyType = require('../utils/strategyTypes')
const VDAI = artifacts.require('VDAI')
const CollateralManager = artifacts.require('CollateralManager')
const AaveStrategy = artifacts.require('AaveV2StrategyDAI')
// const AaveStrategyETH = artifacts.require('AaveStrategyETH')
const VETH = artifacts.require('VETH')
const VesperStrategy = artifacts.require('VesperMakerStrategyETH')
const {BigNumber: BN} = require('ethers')
const DECIMAL18 = BN.from('1000000000000000000')
const ONE_MILLION = DECIMAL18.mul('1000000')

contract('VETH Pool', function (accounts) {
  let vDai, dai // vEth, strategy, weth
  const vDaiPoolObj = {}
  const interestFee = '1500' // 15%
  const [, user1] = accounts
  const feeCollector = accounts[9]

  const strategyConfig = {interestFee, debtRatio: 9000, debtRate: ONE_MILLION}

  beforeEach(async function () {
    this.accounts = accounts
    await setupVPool(vDaiPoolObj, {
      pool: VDAI,
      strategies: [{artifact: AaveStrategy, type: StrategyType.AAAVE, config: strategyConfig, feeCollector}],
      feeCollector,
    })
    vDai = vDaiPoolObj.pool
    dai = await vDaiPoolObj.collateralToken
    await deposit(vDai, dai, 2, user1)
    await vDaiPoolObj.strategies[0].instance.rebalance()
    await setupVPool(this, {
      pool: VETH,
      strategies: [{artifact: VesperStrategy, type: StrategyType.VESPER_MAKER, config: strategyConfig, feeCollector}],
      feeCollector,
      collateralManager: CollateralManager,
      vPool: vDai,
    })
    // this.newStrategy = AaveStrategyETH
    // vEth = this.pool
    // strategy = this.strategy
    // weth = this.collateralToken
  })

  shouldBehaveLikePool('vETH', 'WETH')

  shouldBehaveLikeStrategy('vETH', 'WETH', StrategyType.VESPER_MAKER)

  // it('Should not allow to sweep vToken from pool and strategy', async function () {
  // await deposit(vEth, weth, 10, user1)
  // await vEth.rebalance()
  // let tx = strategy.sweepErc20(vDai.address)
  // await expectRevert(tx, 'not-allowed-to-sweep')
  // tx = vEth.sweepErc20(vDai.address)
  // await expectRevert(tx, 'Not allowed to sweep')
  // })
})
