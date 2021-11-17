'use strict'

const { expect } = require('chai')
const hre = require('hardhat')
const ethers = hre.ethers
const { getUsers, deployContract, createStrategy } = require('./utils/setupHelper')
const addressListFactory = hre.address.ADDRESS_LIST_FACTORY
const Address = require('../helper/mainnet/address')
const StrategyType = require('./utils/strategyTypes')
const VDAI = require('../helper/mainnet/poolConfig').VDAI

describe('Vesper Pool: Admin only function tests', function () {
  const oneMillion = ethers.utils.parseEther('1000000')
  let pool, strategy, accountant
  let user1, user2, user3, user4

  const strategyConfig = {
    name: 'AaveStrategyDAI',
    type: StrategyType.AAVE,
    config: { interestFee: '1500', debtRatio: 9000, debtRate: oneMillion },
  }

  beforeEach(async function () {
    const users = await getUsers()
    ;[, user1, user2, user3, user4] = users

    pool = await deployContract(VDAI.contractName, VDAI.poolParams)
    accountant = await deployContract('PoolAccountant')
    await accountant.init(pool.address)
    await pool.initialize(...VDAI.poolParams, accountant.address, addressListFactory)

    strategyConfig.feeCollector = user4.address
    strategy = await createStrategy(strategyConfig, pool.address, { addressListFactory })
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
          'not-a-keeper',
        )
      })
    })
  })

  describe('Add strategy test', function () {
    it('Should add strategy and make it active', async function () {
      const config = strategyConfig.config
      const tx = accountant.addStrategy(strategy.address, ...Object.values(config))
      await expect(tx)
        .to.emit(accountant, 'StrategyAdded')
        .withArgs(strategy.address, config.interestFee, config.debtRatio, config.debtRate)
      expect((await accountant.strategy(strategy.address)).active, 'Strategy should be active').to.be.true
    })

    it('Should revert if strategy is already active', async function () {
      await accountant.addStrategy(strategy.address, ...Object.values(strategyConfig.config))
      const tx = accountant.addStrategy(strategy.address, ...Object.values(strategyConfig.config))
      // 15 = STRATEGY_IS_ACTIVE
      await expect(tx).to.be.revertedWith('15', 'Strategy is already active')
    })

    it('Should revert if strategy address is zero', async function () {
      const tx = accountant.addStrategy(Address.ZERO, ...Object.values(strategyConfig.config))
      // 10 = INPUT_ADDRESS_IS_ZERO
      await expect(tx).to.be.revertedWith('10', 'Strategy address is zero')
    })

    it('Should revert if debt ratio is above limit', async function () {
      const config = { interestFee: '1500', debtRatio: '10001', debtRate: oneMillion }
      const tx = accountant.addStrategy(strategy.address, ...Object.values(config))
      // 18 = DEBT_RATIO_LIMIT_REACHED, Limit is 10,000
      await expect(tx).to.be.revertedWith('18', 'Input debt ratio is above max limit')
    })

    it('Should revert if interest fee is above limit', async function () {
      const config = { interestFee: '15000', debtRatio: '9000', debtRate: oneMillion }
      const tx = accountant.addStrategy(strategy.address, ...Object.values(config))
      // 11 = FEE_LIMIT_REACHED, Limit is 10,000
      await expect(tx).to.be.revertedWith('11', 'Input interest fee is above max limit')
    })
  })

  describe('Migrate strategy', function () {
    it('Should migrate strategy', async function () {
      const config = strategyConfig.config
      await accountant.addStrategy(strategy.address, ...Object.values(config))
      const newStrategy = await createStrategy(strategyConfig, pool.address, { addressListFactory })
      const tx = pool.migrateStrategy(strategy.address, newStrategy.address)
      await expect(tx)
        .to.emit(accountant, 'StrategyMigrated')
        .withArgs(strategy.address, newStrategy.address, config.interestFee, config.debtRatio, config.debtRate)
      expect((await accountant.strategy(newStrategy.address)).active, 'Strategy should be active').to.be.true
      expect((await accountant.strategy(strategy.address)).active, 'Old strategy should be de-active').to.be.false
    })

    it('Should migrate strategy and replace in strategies array', async function () {
      await accountant.addStrategy(strategy.address, ...Object.values(strategyConfig.config))
      const newStrategy = await createStrategy(strategyConfig, pool.address, { addressListFactory })
      expect(await accountant.strategies(0)).to.be.eq(strategy.address, 'strategies[0] should be old strategy')
      await pool.migrateStrategy(strategy.address, newStrategy.address)
      expect(await accountant.strategies(0)).to.be.eq(newStrategy.address, 'strategies[0] should be new strategy')
    })

    it('Should revert if strategy is invalid', async function () {
      await accountant.addStrategy(strategy.address, ...Object.values(strategyConfig.config))
      const pool2 = await deployContract(VDAI.contractName, VDAI.poolParams)
      const newStrategy = await createStrategy(strategyConfig, pool2.address, { addressListFactory })
      const tx = pool.migrateStrategy(strategy.address, newStrategy.address)
      // 17 = INVALID_STRATEGY
      await expect(tx).to.be.revertedWith('17', 'Strategies has different pool')
    })

    it('Should revert if old strategy is not active', async function () {
      const newStrategy = await createStrategy(strategyConfig, pool.address, { addressListFactory })
      const tx = pool.migrateStrategy(strategy.address, newStrategy.address)
      // 16 = STRATEGY_IS_NOT_ACTIVE
      await expect(tx).to.be.revertedWith('16', 'Old strategy is not active')
    })

    it('Should revert if new strategy is active', async function () {
      const config = strategyConfig.config
      config.debtRatio = '5000'
      await accountant.addStrategy(strategy.address, ...Object.values(config))
      const newStrategy = await createStrategy(strategyConfig, pool.address, { addressListFactory })
      config.debtRatio = '4000'
      await accountant.addStrategy(newStrategy.address, ...Object.values(config))
      const tx = pool.migrateStrategy(strategy.address, newStrategy.address)
      // 15 = STRATEGY_IS_ACTIVE
      await expect(tx).to.be.revertedWith('15', 'New strategy is already active')
    })
  })
})
