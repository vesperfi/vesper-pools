'use strict'

const AddressList = artifacts.require('AddressList')

const {expectRevert, expectEvent} = require('@openzeppelin/test-helpers')

contract('AddressList', async (accounts) => {
  let list

  beforeEach(async () => {
    list = await AddressList.new(accounts[0])
  })

  it('initial length is 0', async () => {
    const length = await list.length()
    assert.equal(length, 0)
  })

  it('get absent should return zero', async () => {
    const answer = await list.get(accounts[1])
    assert.equal(answer, 0)
  })

  it('contains should return false', async () => {
    const answer = await list.contains(accounts[1])
    assert.equal(answer, false)
  })

  it('empty list at should revert', async () => {
    await expectRevert.unspecified(list.at(0))
    await expectRevert.unspecified(list.at(1))
    await expectRevert.unspecified(list.at(100))
  })

  describe('add', async () => {
    it('add new should increase length', async () => {
      await list.add(accounts[1])
      await list.add(accounts[2])
      await list.add(accounts[3])
      const length = await list.length()
      assert.equal(length, 3)
    })

    it('add duplicate should not increase length', async () => {
      await list.add(accounts[1])
      await list.add(accounts[2])
      await list.add(accounts[3])
      await list.add(accounts[1])
      const length = await list.length()
      assert.equal(length, 3)
    })

    it('after add, at should return 1', async () => {
      await list.add(accounts[1])
      const answer = await list.at(0)
      assert.equal(answer[1], 1)
    })

    it('after add, get should return 1', async () => {
      await list.add(accounts[1])
      const value = await list.get(accounts[1])
      assert.equal(value, 1)
    })

    it('after add, get should still return zero on absent', async () => {
      await list.add(accounts[1])
      const answer = await list.get(accounts[4])
      assert.equal(answer, 0)
    })

    it('after add, contains should true', async () => {
      await list.add(accounts[1])
      const answer = await list.contains(accounts[1])
      assert.equal(answer, true)
    })

    it('add new should emit AddressUpdated', async () => {
      await expectEvent(await list.add(accounts[1]), 'AddressUpdated', {a: accounts[1], sender: accounts[0]})
    })

    it('add new should return true', async () => {
      const answer = await list.add.call(accounts[1])
      assert.equal(answer, true)
    })

    it('add duplicate should not emit AddressUpdated', async () => {
      await list.add(accounts[1])
      expectEvent.notEmitted(await list.add(accounts[1]), 'AddressUpdated')
    })

    it('add duplicate should return false', async () => {
      list.add(accounts[1])
      const answer = await list.add.call(accounts[1])
      assert.equal(answer, false)
    })

    it('add by non-admin should revert', async () => {
      await expectRevert.unspecified(list.add(accounts[4], {from: accounts[1]}))
    })
  })

  describe('addMulti', async () => {
    it('after addMulti, get should return 1 as value', async () => {
      await list.addMulti([accounts[1], accounts[2]])
      const value = await list.get(accounts[1])
      assert.equal(value, 1)
    })

    it('addMulti should emit AddressUpdated', async () => {
      const tx = await list.addMulti([accounts[1], accounts[2]])
      await expectEvent(tx, 'AddressUpdated', {a: accounts[1], sender: accounts[0]})
      await expectEvent(tx, 'AddressUpdated', {a: accounts[2], sender: accounts[0]})
    })

    it('addMulti should return number of updated entries', async () => {
      const answer = await list.addMulti.call([accounts[1], accounts[2], accounts[3]])
      assert.equal(answer, 3)
    })

    it('addMulti duplicate should not be counted in number of updated entries', async () => {
      const answer = await list.addMulti.call([accounts[1], accounts[1]])
      assert.equal(answer, 1)
    })

    it('addMulti by non-admin should revert', async () => {
      await expectRevert.unspecified(list.addMulti([accounts[3], accounts[4]], {from: accounts[1]}))
    })
  })

  describe('addValue', async () => {
    it('after addValue, get should return the value', async () => {
      await list.addValue(accounts[1], 42)
      const value = await list.get(accounts[1])
      assert.equal(value, 42)
    })

    it('after addValue, at should return the value', async () => {
      await list.addValue(accounts[1], 42)
      const answer = await list.at(0)
      assert.equal(answer[1], 42)
    })

    it('addValue twice stores the newest value', async () => {
      await list.addValue(accounts[1], 42)
      await list.addValue(accounts[1], 1729)
      const value = await list.get(accounts[1])
      assert.equal(value, 1729)
    })

    it('addValue with 0 should revert', async () => {
      await expectRevert.unspecified(list.addValue(accounts[1], 0))
    })

    it('addValue absent should emit AddressUpdated', async () => {
      await expectEvent(await list.addValue(accounts[1], 42), 'AddressUpdated', {a: accounts[1], sender: accounts[0]})
    })

    it('addValue absent should return true', async () => {
      const answer = await list.addValue.call(accounts[1], 42)
      assert.equal(answer, true)
    })

    it('addValue present with new value should emit AddressUpdated', async () => {
      await list.addValue(accounts[1], 42)
      await expectEvent(await list.addValue(accounts[1], 1729), 'AddressUpdated', {
        a: accounts[1],
        sender: accounts[0]
      })
    })

    it('addValue present with new value should return true', async () => {
      await list.addValue(accounts[1], 42)
      const answer = await list.addValue.call(accounts[1], 1729)
      assert.equal(answer, true)
    })

    it('addValue duplicate should not emit AddressUpdated', async () => {
      await list.addValue(accounts[1], 42)
      await expectEvent.notEmitted(await list.addValue(accounts[1], 42), 'AddressUpdated')
    })

    it('addValue duplicate should return false', async () => {
      await list.addValue(accounts[1], 42)
      const answer = await list.addValue.call(accounts[1], 42)
      assert.equal(answer, false)
    })

    it('addValue by non-admin should revert', async () => {
      await expectRevert.unspecified(list.addValue(accounts[4], 42, {from: accounts[1]}))
    })
  })

  describe('addValueMulti', async () => {
    it('after addValueMulti, get should return the value', async () => {
      await list.addValueMulti([accounts[1], accounts[2]], [42, 32])
      const value = await list.get(accounts[1])
      assert.equal(value, 42)
    })

    it('addValueMulti should emit AddressUpdated', async () => {
      const tx = await list.addValueMulti([accounts[1], accounts[2]], [10, 20])
      await expectEvent(tx, 'AddressUpdated', {a: accounts[1], sender: accounts[0]})
      await expectEvent(tx, 'AddressUpdated', {a: accounts[2], sender: accounts[0]})
    })

    it('addValueMulti should return number of updated entries', async () => {
      const answer = await list.addValueMulti.call([accounts[1], accounts[2], accounts[3]], [5, 10, 15])
      assert.equal(answer, 3)
    })

    it('addValueMulti duplicate should not be counted in number of updated entries', async () => {
      const answer = await list.addValueMulti.call([accounts[1], accounts[1]], [10, 10])
      assert.equal(answer, 1)
    })

    it('addValueMulti by non-admin should revert', async () => {
      const tx = list.addValueMulti([accounts[3], accounts[4]], [20, 40], {from: accounts[1]})
      const errorMessage = 'Sender lacks LIST_ADMIN role'
      await expectRevert(tx, errorMessage)
    })

    it('addValueMulti should revert if address and value array has different length', async () => {
      const tx = list.addValueMulti([accounts[3], accounts[4]], [20])
      const errorMessage = 'Address and value array sizes must be equal'
      await expectRevert(tx, errorMessage)
    })
  })

  describe('remove', async () => {
    it('remove present should decrease length', async () => {
      await list.add(accounts[1])
      await list.add(accounts[2])
      await list.add(accounts[3])
      await list.remove(accounts[2])
      const length = await list.length()
      assert.equal(length, 2)
    })

    it('remove absent should not change length', async () => {
      await list.add(accounts[1])
      await list.add(accounts[2])
      await list.add(accounts[3])
      await list.remove(accounts[4])
      const length = await list.length()
      assert.equal(length, 3)
    })

    it('remove present should emit AddressRemoved', async () => {
      await list.add(accounts[1])
      const tx = await list.remove(accounts[1])
      await expectEvent(tx, 'AddressRemoved', {a: accounts[1], sender: accounts[0]})
    })

    it('remove present should return true', async () => {
      await list.add(accounts[1])
      await list.add(accounts[2])
      await list.add(accounts[3])
      const answer = await list.remove.call(accounts[2])
      assert.equal(answer, true)
    })

    it('remove absent should not emit AddressRemoved', async () => {
      await list.add(accounts[1])
      const tx = await list.remove(accounts[2])
      await expectEvent.notEmitted(tx, 'AddressRemoved')
    })

    it('remove absent should return false', async () => {
      await list.add(accounts[1])
      await list.add(accounts[2])
      await list.add(accounts[3])
      await list.remove(accounts[2])
      let answer = await list.remove.call(accounts[2])
      assert.equal(answer, false)
      answer = await list.remove.call(accounts[4])
      assert.equal(answer, false)
    })

    it('remove by non-admin should revert', async () => {
      await list.add(accounts[1])
      await expectRevert.unspecified(list.remove(accounts[1], {from: accounts[1]}))
    })

    it('after remove, get should return zero', async () => {
      await list.add(accounts[1])
      await list.add(accounts[2])
      await list.add(accounts[3])
      await list.remove(accounts[2])
      const value = await list.get(accounts[2])
      assert.equal(value, 0)
    })
  })

  describe('removeMulti', async () => {
    it('removeMulti should decrease length', async () => {
      await list.addMulti([accounts[1], accounts[2], accounts[3]])
      await list.removeMulti([accounts[1], accounts[2]])
      const length = await list.length()
      assert.equal(length, 1)
    })

    it('removeMulti present should emit AddressRemoved', async () => {
      await list.addMulti([accounts[1], accounts[2], accounts[3]])
      const tx = await list.removeMulti([accounts[1], accounts[3]])
      await expectEvent(tx, 'AddressRemoved', {a: accounts[1], sender: accounts[0]})
      await expectEvent(tx, 'AddressRemoved', {a: accounts[3], sender: accounts[0]})
    })

    it('removeMulti should return number of deleted entries', async () => {
      await list.addMulti([accounts[1], accounts[2], accounts[3]])
      const answer = await list.removeMulti.call([accounts[1], accounts[2], accounts[3]])
      assert.equal(answer, 3)
    })

    it('removeMulti absent should not be counted in number of deleted entries', async () => {
      await list.addMulti([accounts[1], accounts[2], accounts[3]])
      const answer = await list.removeMulti.call([accounts[2], accounts[4]])
      assert.equal(answer, 1)
    })

    it('removeMulti by non-admin should revert', async () => {
      await list.addMulti([accounts[1], accounts[2]])
      await expectRevert.unspecified(list.removeMulti([accounts[1], accounts[2]], {from: accounts[1]}))
    })
  })
})
