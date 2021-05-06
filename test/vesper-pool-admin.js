'use strict'

const {expect} = require('chai')
const {expectRevert, constants} = require('@openzeppelin/test-helpers')
const {ethers} = require('hardhat')
/* eslint-disable mocha/max-top-level-suites */
describe('Vesper Pool: Admin only function tests', function () {
  let pool

  let user1

  beforeEach(async function () {
    ;[, user1] = (await ethers.getSigners()).map(signers => signers.address)
    const POOL = await ethers.getContractFactory('VETH')
    pool = await POOL.deploy()
  })

  describe('Create keeper list', function () {
    it('Should create keeper list and add governor in list', async function () {
      expect(await pool.keepers()).to.equal(constants.ZERO_ADDRESS, 'List already exist')
      await pool.createKeeperList()
      const keeperList = await pool.keepers()
      expect(keeperList).to.not.equal(constants.ZERO_ADDRESS, 'List creation failed')
      const addressList = await ethers.getContractAt('IAddressList', keeperList)
      expect(await addressList.length()).to.be.equal('1', 'List should have 1 element')
    })

    it('Should revert if list already created', async function () {
      await pool.createKeeperList()
      // Trying to create list again
      const tx = pool.createKeeperList()
      await expectRevert(tx, 'keeper-list-already-created')
    })
  })

  describe('Update keeper list', function () {
    let keeperList, addressList
    beforeEach(async function () {
      await pool.createKeeperList()
      keeperList = await pool.keepers()
      addressList = await ethers.getContractAt('IAddressList', keeperList)
    })

    context('Add address in keeper list', function () {
      it('Should add address in keeper list', async function () {
        await pool.addInList(keeperList, user1)
        expect(await addressList.length()).to.be.equal('2', 'Address added successfuly')
      })

      it('Should revert if address already exist in list', async function () {
        await pool.addInList(keeperList, user1)
        const tx = pool.addInList(keeperList, user1)
        await expectRevert(tx, 'address-already-in-list')
      })
    })
    context('Remove address from keeper list', function () {
      it('Should remove address from keeper list', async function () {
        await pool.addInList(keeperList, user1)
        await pool.removeFromList(keeperList, user1)
        expect(await addressList.length()).to.be.equal('1', 'Address removed successfuly')
      })

      it('Should revert if address not in list', async function () {
        const tx = pool.removeFromList(keeperList, user1)
        await expectRevert(tx, 'address-not-in-list')
      })
    })
  })

  // TODO Add all other admin function tests
})
