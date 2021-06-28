'use strict'

/* eslint-disable no-console */

const {expect} = require('chai')
const hre = require('hardhat')
const ethers = hre.ethers

const {swapEthForToken} = require('../utils/tokenSwapper')

// We use these
const DECIMAL = ethers.BigNumber.from('1000000000000000000')
const DAI = '0x6b175474e89094c44da98b954eedeac495271d0f'
const USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
const THREECRV = '0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490'
const GAUGE = '0xbFcF63294aD7105dEa65aA58F8AE5BE2D9d0952A'
const CRV = '0xD533a949740bb3306d119CC777fa900bA034cd52'

// globals
let poolManager, daiToken, lpToken, gaugeToken, crvToken, daiBalance,
  lpBalance, gaugeBalance, crvBalance, usdcToken

async function getBalances() {
  daiBalance = await daiToken.balanceOf(poolManager.address)
  lpBalance = await lpToken.balanceOf(poolManager.address)
  gaugeBalance = await gaugeToken.balanceOf(poolManager.address)
  crvBalance = await crvToken.balanceOf(poolManager.address)
}

function convertFrom18(amount) {
  const divisor = DECIMAL.div(ethers.BigNumber.from('10').pow(ethers.BigNumber.from(6)))
  return ethers.BigNumber.from(amount).div(divisor)
}

/* eslint-disable mocha/max-top-level-suites, mocha/no-top-level-hooks */
describe('Crv3PoolMgr', function() {
  before(async function() {
    const owner = (await ethers.getSigners())[0]
    const PM = await ethers.getContractFactory('Crv3PoolMock')
    poolManager = await PM.deploy()
    await poolManager.deployed()
    // 10 ETH for DAI
    await swapEthForToken(10, DAI, { signer: owner }, poolManager.address)
    daiToken = await ethers.getContractAt('IERC20', DAI)
    lpToken = await ethers.getContractAt('IERC20', THREECRV)
    gaugeToken = await ethers.getContractAt('IERC20', GAUGE)
    crvToken = await ethers.getContractAt('IERC20', CRV)
    usdcToken = await ethers.getContractAt('IERC20', USDC)
    await poolManager.approveLpForGauge()
    await poolManager.approveTokenForPool(DAI)
  })

  beforeEach(async function() {
    await getBalances()
  })

  describe('depositToCRVPool', function() {
    it('Should deposit DAI into the pool', async function() {
      const daiAmt = ethers.BigNumber.from(4000).mul(DECIMAL)
      await poolManager.depositToCrvPool(daiAmt, 0, 0)
      expect(await daiToken.balanceOf(poolManager.address)).to.be.equal(daiBalance.sub(daiAmt))
      expect(await lpToken.balanceOf(poolManager.address)).to.be.gt(0)
    })
  })

  describe('withdrawAsFromCRVPool', function() {
    it('Should withdraw DAI from the pool', async function() {
      const wdAmt = lpBalance.div(ethers.BigNumber.from(4))
      await poolManager.withdrawAsFromCrvPool(wdAmt, 0, 0)
      expect(await daiToken.balanceOf(poolManager.address)).to.be.gt(daiBalance)
      expect(await lpToken.balanceOf(poolManager.address)).to.be.equal(lpBalance.sub(wdAmt))
    })
  })

  describe('calcWithdrawLpAs', function() {
    it('Should calculate LP amount when there is nothing in the gauge DAI', async function() {
      const daiNeeded = lpBalance.div(ethers.BigNumber.from(4))
      const lpAmt = await poolManager.calcWithdrawLpAs(daiNeeded, 0)
      expect(lpAmt.lpToWithdraw).to.be.gt(0)
      expect(lpAmt.lpToWithdraw).to.be.lt(daiNeeded)
      expect(lpAmt.unstakeAmt).to.be.equal(0)
    })

    it('Should calculate LP amount and withdraw', async function() {
      const usdcNeeded = ethers.BigNumber.from(100000000) // $100
      const lpAmt = await poolManager.calcWithdrawLpAs(usdcNeeded, 1)
      expect(lpAmt.lpToWithdraw).to.be.gt(0)
      expect(lpAmt.unstakeAmt).to.be.equal(0)
      const rate = await poolManager.minimumLpPrice(ethers.BigNumber.from('1000000000000000000'))
      const minAmt = await poolManager.estimateFeeImpact(convertFrom18(lpAmt.lpToWithdraw.mul(rate).div(DECIMAL)))
      await poolManager.withdrawAsFromCrvPool(lpAmt.lpToWithdraw, minAmt, 1)
      const newUSDCBalance = await usdcToken.balanceOf(poolManager.address)
      expect(newUSDCBalance).to.be.gte(usdcNeeded, 'wrong amount withdrawn')
    })

    it('Should calculate LP amount when there is something in the gauge', async function() {
      await poolManager.stakeAllLpToGauge()
      const daiNeeded = lpBalance.div(ethers.BigNumber.from(2))
      const lpAmt = await poolManager.calcWithdrawLpAs(daiNeeded, 0)
      expect(lpAmt.lpToWithdraw).to.be.gt(0)
      expect(lpAmt.lpToWithdraw).to.be.lt(daiNeeded)
      expect(lpAmt.unstakeAmt).to.be.gt(0)
      await poolManager.unstakeLpFromGauge(lpAmt.unstakeAmt)
      await poolManager.withdrawAsFromCrvPool(lpAmt.lpToWithdraw, 0, 0)
      const newDAIBalance = await daiToken.balanceOf(poolManager.address)
      const withdrawn = newDAIBalance.sub(daiBalance)
      expect(withdrawn).to.be.gte(daiNeeded, 'wrong amount withdrawn')
      await poolManager.unstakeAllLpFromGauge()
    })
  })

  describe('stakeAllLPToGauge', function() {
    it('Should stake all LP to the Gauge', async function() {
      await poolManager.stakeAllLpToGauge()
      expect(await gaugeToken.balanceOf(poolManager.address)).to.be.gt(gaugeBalance)
      expect(await lpToken.balanceOf(poolManager.address)).to.be.equal(0)
    })
  })

  describe('unstakeLPFromGauge', function() {
    it('Should remove LP from the Gauge', async function() {
      const wdAmt = gaugeBalance.div(ethers.BigNumber.from(4))
      await poolManager.unstakeLpFromGauge(wdAmt)
      expect(await gaugeToken.balanceOf(poolManager.address)).to.be.equal(gaugeBalance.sub(wdAmt))
      expect(await lpToken.balanceOf(poolManager.address)).to.be.gt(lpBalance)
    })
  })

  describe('unstakeAllLPFromGauge', function() {
    it('Should remove LP from the Gauge', async function() {
      await poolManager.unstakeAllLpFromGauge()
      expect(await gaugeToken.balanceOf(poolManager.address)).to.be.equal(0)
      expect(await lpToken.balanceOf(poolManager.address)).to.be.gt(lpBalance)
    })
  })

  describe('Rewards', function() {
    before(async function() {
      daiBalance = await daiToken.balanceOf(poolManager.address)
      await poolManager.depositToCrvPool(daiBalance, 0, 0)
      await poolManager.stakeAllLpToGauge()
      await getBalances()
      expect(daiBalance).to.be.equal(0)
      expect(lpBalance).to.be.equal(0)
      expect(gaugeBalance).to.be.gt(0)
      expect(crvBalance).to.be.equal(0)
      await poolManager.setCheckpoint()
    })

    it('Should calculate rewards', async function() {
      const availableRewards = await poolManager.claimableRewards()
      expect(availableRewards).to.be.gt(0)
    })

    it('Should claim rewards', async function() {
      await poolManager.claimCrv()
      crvBalance = await crvToken.balanceOf(poolManager.address)
      expect(crvBalance).to.be.gt(0)
      const availableRewards = await poolManager.claimableRewards()
      expect(availableRewards).to.be.equal(0)
    })
  })
})
