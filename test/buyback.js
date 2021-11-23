'use strict'
const { unlock } = require('./utils/setupHelper')
const { expect } = require('chai')
const { ethers, deployments } = require('hardhat')
const { getChain } = require('./utils/chains')
const Address = require(`../helper/${getChain()}/address`)

describe('Buyback', function () {
  let snapshotId
  let governor
  let someAccount
  let vspHolder
  let feeCollector
  let buyback
  let vsp
  let dai
  let vaDAI
  let vVSP
  let keepers

  beforeEach(async function () {
    snapshotId = await ethers.provider.send('evm_snapshot', [])
    ;[, someAccount] = await ethers.getSigners()
    governor = await unlock(Address.GOVERNOR)
    feeCollector = await unlock(Address.FEE_COLLECTOR)
    vspHolder = await unlock(Address.vVSP)

    const {
      BuyBack: { address: buyBackAddress },
    } = await deployments.fixture('BuyBack')
    buyback = await ethers.getContractAt('BuyBack', buyBackAddress)

    await buyback.addInKeepersList(feeCollector.address)

    buyback = buyback.connect(feeCollector)
    keepers = await ethers.getContractAt('IAddressList', await buyback.keepers(), feeCollector)

    vVSP = await ethers.getContractAt('ERC20', Address.vVSP, feeCollector)
    vsp = await ethers.getContractAt('ERC20', Address.VSP, feeCollector)
    dai = await ethers.getContractAt('ERC20', Address.DAI, feeCollector)
    vaDAI = await ethers.getContractAt('ERC20', Address.vaDAI, feeCollector)
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
      const vVspVspBefore = await vsp.balanceOf(Address.vVSP)
      expect(buybackDaiBefore).gt('0')

      // when
      await buyback.doInfinityApproval(dai.address)
      await buyback.swapForVspAndTransferToVVSP(dai.address, amount)

      // then
      const buybackDaiAfter = await dai.balanceOf(buyback.address)
      const vVspVspAfter = await vsp.balanceOf(Address.vVSP)

      expect(buybackDaiAfter).eq('0')
      expect(vVspVspAfter).gt(vVspVspBefore)
    })

    it('should revert if not keeer', async function () {
      const tx = buyback.connect(someAccount).depositAndUnwrap(vaDAI.address, '1')
      await expect(tx).revertedWith('not-a-keeper')
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
      await expect(tx).revertedWith('not-the-governor')
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
      await expect(tx).revertedWith('not-the-governor')
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
