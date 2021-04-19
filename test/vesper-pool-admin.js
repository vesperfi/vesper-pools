'use strict'

const {expect} = require('chai')
const {expectRevert, constants} = require('@openzeppelin/test-helpers')
const VETH = artifacts.require('VETH')
const AddressList = artifacts.require('IAddressList')
/* eslint-disable mocha/max-top-level-suites */
contract('Vesper Pool: Admin only function tests', function (accounts) {
  let pool

  const [, user1] = accounts

  beforeEach(async function () {
    pool = await VETH.new()
  })

  describe('Create guardian list', function () {
    it('Should create guardian list and add governor in list', async function () {
      expect(await pool.guardians()).to.equal(constants.ZERO_ADDRESS, 'List already exist')
      await pool.createGuardianList()
      const guardianList = await pool.guardians()
      expect(guardianList).to.not.equal(constants.ZERO_ADDRESS, 'List creation failed')
      const addressList = await AddressList.at(guardianList)
      expect(await addressList.length()).to.be.bignumber.equal('1', 'List should have 1 element')
    })

    it('Should revert if list already created', async function () {
      await pool.createGuardianList()
      // Trying to create list again
      const tx = pool.createGuardianList()
      await expectRevert(tx, 'guardian-list-already-created')
    })
  })

  describe('Update guardian list', function () {
    let guardianList, addressList
    beforeEach(async function () {
      await pool.createGuardianList()
      guardianList = await pool.guardians()
      addressList = await AddressList.at(guardianList)
    })

    context('Add address in guardian list', function () {
      it('Should add address in guardian list', async function () {
        await pool.addInList(guardianList, user1)
        expect(await addressList.length()).to.be.bignumber.equal('2', 'Address added successfuly')
      })

      it('Should revert if address already exist in list', async function () {
        await pool.addInList(guardianList, user1)
        const tx = pool.addInList(guardianList, user1)
        await expectRevert(tx, 'address-already-in-list')
      })
    })
    context('Remove address from guardian list', function () {
      it('Should remove address from guardian list', async function () {
        await pool.addInList(guardianList, user1)
        await pool.removeFromList(guardianList, user1)
        expect(await addressList.length()).to.be.bignumber.equal('1', 'Address removed successfuly')
      })

      it('Should revert if address not in list', async function () {
        const tx = pool.removeFromList(guardianList, user1)
        await expectRevert(tx, 'address-not-in-list')
      })
    })
  })

  // TODO Add all other admin function tests
})
