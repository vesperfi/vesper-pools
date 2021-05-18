'use strict'

const {expect} = require('chai')
const {getUsers} = require('../utils/setupHelper')
const {constants} = require('@openzeppelin/test-helpers')
const metAddress = '0xa3d58c4e56fedcae3a7c43a725aee9a71f0ece4e'
const aaveLendingPoolAddressesProvider = '0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5'

// Aave strategy specific tests
function shouldBehaveLikeAaveStrategy(strategyIndex, poolName) {
  let strategy, owner, user1, user2

  describe(`${poolName}:: AaveStrategy specific tests`, function () {
    beforeEach(async function () {
      const users = await getUsers()
      ;[owner, user1, user2] = users
      strategy = this.strategies[strategyIndex].instance
    })

    it('Should revert when Cooldown started from non keeper user', async function () {
      await expect(strategy.connect(user2.signer).startCooldown()).to.be.revertedWith('caller-is-not-a-keeper')
    })

    it('Should start Cooldown when called from keeper user', async function () {
      await strategy.addKeeper(user1.address)
      await expect(strategy.connect(user1.signer).startCooldown()).to.not.reverted
    })

    it('Should revert when update address provider is called from non governor', async function () {
      await expect(strategy.connect(user1.signer).updateAddressesProvider(metAddress)).to.be.revertedWith(
        'caller-is-not-the-governor'
      )
      await expect(strategy.connect(owner.signer).updateAddressesProvider(metAddress)).to.be.reverted
    })

    it('Should revert when provider address is not correct', async function () {
      await expect(strategy.connect(owner.signer).updateAddressesProvider(metAddress)).to.be.reverted
      await expect(strategy.connect(owner.signer).updateAddressesProvider(constants.ZERO_ADDRESS)).to.be.revertedWith(
        'provider-address-is-zero'
      )
    })

    it('Should revert when provider address is same', async function () {
      const currentProviderAddress = await strategy.aaveAddressesProvider()
      await expect(strategy.connect(owner.signer).updateAddressesProvider(currentProviderAddress)).to.be.revertedWith(
        'same-addresses-provider'
      )
      await expect(
        strategy.connect(owner.signer).updateAddressesProvider(aaveLendingPoolAddressesProvider)
      ).to.be.revertedWith('same-addresses-provider')
    })
  })
}

module.exports = {shouldBehaveLikeAaveStrategy}
