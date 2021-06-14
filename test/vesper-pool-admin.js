'use strict'

const {expect} = require('chai')
const {ethers} = require('hardhat')
const {getUsers, deployContract} = require('./utils/setupHelper')

/* eslint-disable mocha/max-top-level-suites */
describe('Vesper Pool: Admin only function tests', function () {
  const poolName = 'VDAI'
  const addressListFactory = '0xded8217De022706A191eE7Ee0Dc9df1185Fb5dA3'
  let pool
  let user1, user2, user3, user4

  beforeEach(async function () {
    const users = await getUsers()
    ;[, user1, user2, user3, user4] = users
    pool = await deployContract(poolName)
    await pool.initialize(addressListFactory)
  })

  describe('Update keeper list', function () {
    let keeperList, addressList
    beforeEach(async function () {
      keeperList = await pool.keepers()
      addressList = await ethers.getContractAt('IAddressList', keeperList)
    })

    context('Add address in keeper list', function () {
      it('Should add address in keeper list', async function () {
        await pool.addInList(keeperList, user1.address)
        expect(await addressList.length()).to.be.equal('2', 'Address added successfully')
      })

      it('Should revert if address already exist in list', async function () {
        await pool.addInList(keeperList, user1.address)
        await expect(pool.addInList(keeperList, user1.address)).to.be.revertedWith('13')
      })
    })
    context('Remove address from keeper list', function () {
      it('Should remove address from keeper list', async function () {
        await pool.addInList(keeperList, user1.address)
        await pool.removeFromList(keeperList, user1.address)
        expect(await addressList.length()).to.be.equal('1', 'Address removed successfully')
      })

      it('Should revert if address not in list', async function () {
        await expect(pool.removeFromList(keeperList, user1.address)).to.be.revertedWith('14')
      })

      it('Should revert if non-gov users add in keeper', async function () {
        await expect(pool.connect(user3.signer).addInList(keeperList, user1.address)).to.be.revertedWith('not-a-keeper')
      })
    })
  })

  describe('Keeper operations', function () {
    let keeperList
    beforeEach(async function () {
      keeperList = await pool.keepers()
      await pool.addInList(keeperList, user1.address)
    })

    it('Should pause pool', async function () {
      const tx = pool.connect(user1.signer).pause()
      await expect(tx).to.not.reverted
    })

    it('Should unpause pool', async function () {
      await pool.connect(user1.signer).pause()
      const tx = pool.connect(user1.signer).unpause()
      await expect(tx).to.not.reverted
    })

    it('Should not pause pool', async function () {
      await expect(pool.connect(user2.signer).pause()).to.be.revertedWith('not-a-keeper')
    })

    it('Should not unpause pool', async function () {
      await expect(pool.connect(user1.signer).unpause()).to.be.revertedWith('not-paused')
    })

    it('Should shutdown pool', async function () {
      const tx = pool.connect(user1.signer).shutdown()
      await expect(tx).to.not.reverted
    })

    it('Should open pool', async function () {
      let tx = pool.connect(user1.signer).shutdown()
      await expect(tx).to.not.reverted
      tx = pool.connect(user1.signer).open()
      await expect(tx).to.not.reverted
    })

    it('Should not shutdown pool', async function () {
      await expect(pool.connect(user2.signer).shutdown()).to.be.revertedWith('not-a-keeper')
    })

    it('Should not open pool', async function () {
      await expect(pool.connect(user2.signer).open()).to.be.revertedWith('not-a-keeper')
    })
  })

  describe('Update maintainer list', function () {
    let addressList, maintainersList, keeperList
    beforeEach(async function () {
      keeperList = await pool.keepers()
      await pool.addInList(keeperList, user1.address)
      maintainersList = await pool.maintainers()
      addressList = await ethers.getContractAt('IAddressList', maintainersList)
    })

    context('Add address in maintainer list', function () {
      it('Admin can add/remove address in maintainer list', async function () {
        await pool.addInList(maintainersList, user2.address)
        expect(await addressList.length()).to.be.equal('2', 'Address added successfully')
        await pool.connect(user1.signer).removeFromList(maintainersList, user2.address)
        expect(await addressList.length()).to.be.equal('1', 'Address removed successfully')
      })

      it('Keeper can add/remove address in maintainer list', async function () {
        await pool.connect(user1.signer).addInList(maintainersList, user3.address)
        expect(await addressList.length()).to.be.equal('2', 'Address added successfully')
        await pool.connect(user1.signer).removeFromList(maintainersList, user3.address)
        expect(await addressList.length()).to.be.equal('1', 'Address removed successfully')
      })

      it('Should revert if address already exist in list', async function () {
        await pool.addInList(maintainersList, user2.address)
        await expect(pool.connect(user1.signer).addInList(maintainersList, user2.address)).to.be.revertedWith('13')
      })

      it('Should revert if not authorized users add in maintainer', async function () {
        await expect(pool.connect(user3.signer).addInList(maintainersList, user4.address)).to.be.revertedWith(
          'not-a-keeper'
        )
      })
    })
  })

  // TODO Add all other admin function tests
})
