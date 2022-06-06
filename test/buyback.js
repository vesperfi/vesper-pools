'use strict'
const { unlock } = require('./utils/setupHelper')
const { expect } = require('chai')
const hre = require('hardhat')
const { ethers, deployments } = hre
const { getChain } = require('./utils/chains')
const Address = require(`../helper/${getChain()}/address`)
const { adjustBalance } = require('./utils/balance')
const { parseUnits } = require('ethers/lib/utils')
const { swapEthForToken } = require('./utils/tokenSwapper')

// From `deploy/utils/buyback.js` script
const GOVERNOR = '0xdf826ff6518e609E4cEE86299d40611C148099d5'

describe('Buyback', function () {
  let snapshotId
  let governor
  let someAccount
  let vspHolder
  let feeCollector
  let buyback
  let vsp
  let dai
  let usdc
  let vaDAI
  let vVSP
  let keepers

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[, someAccount] = await ethers.getSigners()
    governor = await unlock(GOVERNOR)
    feeCollector = await unlock(Address.Vesper.FEE_COLLECTOR)
    vspHolder = await unlock(Address.Vesper.vVSP)
    hre.targetChain = getChain()
    const {
      BuyBack: { address: buyBackAddress },
    } = await deployments.fixture('BuyBack')
    buyback = await ethers.getContractAt('BuyBack', buyBackAddress)

    await buyback.addInKeepersList(feeCollector.address)
    await buyback.connect(governor).updateSwapSlippage(10000) // 100% slippage for test purpose

    buyback = buyback.connect(feeCollector)
    keepers = await ethers.getContractAt('IAddressList', await buyback.keepers(), feeCollector)

    vVSP = await ethers.getContractAt('ERC20', Address.Vesper.vVSP, feeCollector)
    vsp = await ethers.getContractAt('ERC20', Address.Vesper.VSP, feeCollector)
    dai = await ethers.getContractAt('ERC20', Address.DAI, feeCollector)
    usdc = await ethers.getContractAt('ERC20', Address.USDC, feeCollector)
    vaDAI = await ethers.getContractAt('ERC20', Address.Vesper.vaDAI, feeCollector)
    await swapEthForToken(1, Address.DAI, someAccount, Address.Vesper.FEE_COLLECTOR)
  })

  afterEach(async function () {
    await ethers.provider.send('evm_revert', [snapshotId])
  })

  it('should have correct initial state', async function () {
    expect(await buyback.governor()).eq(governor.address)
  })

  describe('swapForVspAndTransferToVVSP', function () {
    it('should swap unwrapped token to VSP and transfer to vVVSP', async function () {
      // given
      const amount = await dai.balanceOf(feeCollector.address)
      await dai.transfer(buyback.address, amount)
      const buybackDaiBefore = await dai.balanceOf(buyback.address)
      const vVspVspBefore = await vsp.balanceOf(Address.Vesper.vVSP)
      expect(buybackDaiBefore).gt('0')

      // when
      await buyback.doInfinityApproval(dai.address)
      const tx = await buyback.swapForVspAndTransferToVVSP(dai.address, amount)

      // then
      const buybackDaiAfter = await dai.balanceOf(buyback.address)
      const vVspVspAfter = await vsp.balanceOf(Address.Vesper.vVSP)
      const expectedVspBought = vVspVspAfter.sub(vVspVspBefore)

      const receipt = await tx.wait()
      const [event] = receipt.events.filter(l => l.event === 'VspBoughtBack')
      expect(event.args).deep.eq([dai.address, amount, expectedVspBought])

      expect(buybackDaiAfter).eq('0')
      expect(vVspVspAfter).gt(vVspVspBefore)
    })

    it('should revert if not keeper', async function () {
      const tx = buyback.connect(someAccount).depositAndUnwrap(vaDAI.address, '1')
      await expect(tx).revertedWith('not-a-keeper')
    })
  })

  describe('doInfinityApproval', function () {
    let swapManager
    let routerAddress

    beforeEach(async function () {
      swapManager = new ethers.Contract(
        await buyback.swapManager(),
        ['function ROUTERS(uint256) view returns (address)'],
        someAccount,
      )

      // Note: With the current state the `SwapManager` will use router[1]
      routerAddress = await swapManager.ROUTERS(1)
    })

    it("should give infinity approval for swap manager's routers", async function () {
      // given
      expect(await dai.allowance(buyback.address, routerAddress)).eq(0)

      // when
      await buyback.doInfinityApproval(dai.address)

      // then
      expect(await dai.allowance(buyback.address, routerAddress)).eq(ethers.constants.MaxUint256)
    })

    it('should give infinity approval twice', async function () {
      // Note: Using USDC instead of DAI because DAI doesn't decrease allowance if it's uint256(-1)
      await adjustBalance(usdc.address, feeCollector.address, parseUnits('1000', 6))

      // given
      await buyback.doInfinityApproval(usdc.address)
      expect(await usdc.allowance(buyback.address, routerAddress)).eq(ethers.constants.MaxUint256)

      const amount = await usdc.balanceOf(feeCollector.address)
      expect(amount).gt(0)
      await usdc.transfer(buyback.address, amount)
      await buyback.swapForVspAndTransferToVVSP(usdc.address, amount)

      expect(await usdc.allowance(buyback.address, routerAddress)).eq(ethers.constants.MaxUint256)

      // when
      await buyback.doInfinityApproval(usdc.address)

      // then
      expect(await usdc.allowance(buyback.address, routerAddress)).eq(ethers.constants.MaxUint256)
    })
  })

  describe('depositAndUnwrap', function () {
    it('should deposit and unwrap', async function () {
      // given
      const amount = await vaDAI.balanceOf(feeCollector.address)
      const daiBefore = await dai.balanceOf(buyback.address)
      expect(daiBefore).eq('0')

      // when
      await vaDAI.approve(buyback.address, amount)
      await buyback.depositAndUnwrap(vaDAI.address, amount)

      // then
      const daiAfter = await dai.balanceOf(buyback.address)
      expect(daiAfter).gt('0')
    })

    it('should revert if not keeer', async function () {
      const tx = buyback.connect(someAccount).depositAndUnwrap(vaDAI.address, '1')
      await expect(tx).revertedWith('not-a-keeper')
    })
  })

  describe('unwrap', function () {
    it('should unwrap', async function () {
      // given
      const amount = await vaDAI.balanceOf(feeCollector.address)
      await vaDAI.transfer(buyback.address, amount)
      const vaDaiBefore = await vaDAI.balanceOf(buyback.address)
      const daiBefore = await dai.balanceOf(buyback.address)
      expect(vaDaiBefore).gt('0')
      expect(daiBefore).eq('0')

      // when
      await buyback.unwrap(vaDAI.address, amount)

      // then
      const vaDaiAfter = await vaDAI.balanceOf(buyback.address)
      const daiAfter = await dai.balanceOf(buyback.address)
      expect(vaDaiAfter).eq('0')
      expect(daiAfter).gt('0')
    })

    it('should revert if not keeer', async function () {
      const tx = buyback.connect(someAccount).unwrap(vaDAI.address, '1')
      await expect(tx).revertedWith('not-a-keeper')
    })
  })

  describe('unwrapAll', function () {
    it('should unwrap all balance', async function () {
      // given
      const amount = await vaDAI.balanceOf(feeCollector.address)
      await vaDAI.transfer(buyback.address, amount)
      const vaDaiBefore = await vaDAI.balanceOf(buyback.address)
      const daiBefore = await dai.balanceOf(buyback.address)
      expect(vaDaiBefore).gt('0')
      expect(daiBefore).eq('0')

      // when
      await buyback.unwrapAll(vaDAI.address)

      // then
      const vaDaiAfter = await vaDAI.balanceOf(buyback.address)
      const daiAfter = await dai.balanceOf(buyback.address)
      expect(vaDaiAfter).eq('0')
      expect(daiAfter).gt('0')
    })

    it('should revert if not keeer', async function () {
      const tx = buyback.connect(someAccount).unwrapAll(vaDAI.address)
      await expect(tx).revertedWith('not-a-keeper')
    })
  })

  describe('transferVspToVVSP', function () {
    it('should transfer VSP to vVSP', async function () {
      // given
      const amount = await vsp.balanceOf(vspHolder.address)
      await vsp.connect(vspHolder).transfer(buyback.address, amount)
      expect(await vsp.balanceOf(buyback.address)).gt('0')

      // when
      const tx = () => buyback.transferVspToVVSP(amount)

      // then
      await expect(tx).changeTokenBalances(vsp, [buyback, vVSP], [amount.mul('-1'), amount])
    })

    it('should revert if not keeer', async function () {
      const tx = buyback.connect(someAccount).transferVspToVVSP('1')
      await expect(tx).revertedWith('not-a-keeper')
    })
  })

  describe('transferAllVspToVVSP', function () {
    it('should transfer all VSP balance to vVSP', async function () {
      // given
      const amount = await vsp.balanceOf(vspHolder.address)
      await vsp.connect(vspHolder).transfer(buyback.address, amount)
      expect(await vsp.balanceOf(buyback.address)).gt('0')

      // when
      const tx = () => buyback.transferAllVspToVVSP()

      // then
      await expect(tx).changeTokenBalances(vsp, [buyback, vVSP], [amount.mul('-1'), amount])
    })

    it('should revert if not keeer', async function () {
      const tx = buyback.connect(someAccount).transferAllVspToVVSP()
      await expect(tx).revertedWith('not-a-keeper')
    })
  })

  describe('migrateAssets', function () {
    it('should migrate assets to a new address', async function () {
      // given
      await dai.transfer(buyback.address, await dai.balanceOf(feeCollector.address))
      await vsp.connect(vspHolder).transfer(buyback.address, await vsp.balanceOf(vspHolder.address))
      await vaDAI.transfer(buyback.address, await vaDAI.balanceOf(feeCollector.address))

      expect(await dai.balanceOf(someAccount.address)).eq('0')
      expect(await vsp.balanceOf(someAccount.address)).eq('0')
      expect(await vaDAI.balanceOf(someAccount.address)).eq('0')

      const daiAmount = await dai.balanceOf(buyback.address)
      const vspAmount = await vsp.balanceOf(buyback.address)
      const vaDaiAmount = await vaDAI.balanceOf(buyback.address)

      expect(daiAmount).gt('0')
      expect(vspAmount).gt('0')
      expect(vaDaiAmount).gt('0')

      // when
      await buyback.connect(governor).migrateAssets([dai.address, vsp.address, vaDAI.address], someAccount.address)

      // then
      expect(await dai.balanceOf(buyback.address)).eq('0')
      expect(await vsp.balanceOf(buyback.address)).eq('0')
      expect(await vaDAI.balanceOf(buyback.address)).eq('0')

      expect(await dai.balanceOf(someAccount.address)).gt('0')
      expect(await vsp.balanceOf(someAccount.address)).gt('0')
      expect(await vaDAI.balanceOf(someAccount.address)).gt('0')
    })

    it('should revert if not governor', async function () {
      const tx = buyback.connect(someAccount).migrateAssets([dai.address], someAccount.address)
      await expect(tx).revertedWith('not-governor')
    })
  })

  describe('batch', function () {
    it('should perform batched tasks', async function () {
      // given
      const amount = await vaDAI.balanceOf(feeCollector.address)
      await vaDAI.transfer(buyback.address, amount)

      const vspBefore = await vsp.balanceOf(vVSP.address)

      // when
      const unwrapCall = buyback.interface.encodeFunctionData('unwrapAll', [vaDAI.address])
      const approveCall = buyback.interface.encodeFunctionData('doInfinityApproval', [dai.address])
      const buybackCall = buyback.interface.encodeFunctionData('swapForVspAndTransferToVVSP', [
        dai.address,
        amount.div('2'),
      ])
      await buyback.batch([unwrapCall, approveCall, buybackCall], true)

      const vspAfter = await vsp.balanceOf(vVSP.address)

      // them
      expect(vspAfter).gt(vspBefore)
    })

    it('should revert if not have enough access', async function () {
      const call = buyback.interface.encodeFunctionData('migrateAssets', [[dai.address], someAccount.address])
      const tx = buyback.connect(someAccount).batch([call], true)
      await expect(tx).revertedWith('not-governor')
    })
  })

  describe('addInKeepersList', function () {
    it('should add keeper', async function () {
      // given
      expect(await keepers.contains(someAccount.address)).false

      // when
      await buyback.addInKeepersList(someAccount.address)

      // then
      expect(await keepers.contains(someAccount.address)).true
    })

    it('should revert if not have enough access', async function () {
      const tx = buyback.connect(someAccount).addInKeepersList(someAccount.address)
      await expect(tx).revertedWith('not-a-keeper')
    })
  })

  describe('removeFromKeepersList', function () {
    it('should remove keeper', async function () {
      // given
      await buyback.addInKeepersList(someAccount.address)
      expect(await keepers.contains(someAccount.address)).true

      // when
      await buyback.removeFromKeepersList(someAccount.address)

      // then
      expect(await keepers.contains(someAccount.address)).false
    })

    it('should revert if not have enough access', async function () {
      const tx = buyback.connect(someAccount).removeFromKeepersList(someAccount.address)
      await expect(tx).revertedWith('not-a-keeper')
    })
  })
})
