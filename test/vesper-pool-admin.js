'use strict'

const { expect } = require('chai')
const { getUsers, deployContract, createStrategy } = require('./utils/setupHelper')

const { poolConfig, strategyConfig } = require('./utils/chains').getChainData()
const VDAI = poolConfig.VDAI
const AaveStrategyDAI = strategyConfig.AaveStrategyDAI

describe('Vesper Pool: Admin only function tests', function () {
  let pool, strategy, accountant
  let user1, user2, user3, user4

  AaveStrategyDAI.config.debtRatio = 9000

  beforeEach(async function () {
    const users = await getUsers()
    ;[, user1, user2, user3, user4] = users

    pool = await deployContract(VDAI.contractName, VDAI.poolParams)
    accountant = await deployContract('PoolAccountant')
    await accountant.init(pool.address)
    await pool.initialize(...VDAI.poolParams, accountant.address)

    AaveStrategyDAI.feeCollector = user4.address
    strategy = await createStrategy(AaveStrategyDAI, pool.address)
  })

  describe('Update keeper list', function () {
    context('Add address in keeper list', function () {
      it('Should add address in keeper list', async function () {
        await pool.addKeeper(user1.address)
        expect((await pool.keepers()).length).to.be.equal(2, 'Address added successfully')
      })

      it('Should revert if address already exist in list', async function () {
        await pool.addKeeper(user1.address)
        await expect(pool.addKeeper(user1.address)).to.be.revertedWith('13')
      })
    })
    context('Remove address from keeper list', function () {
      it('Should remove address from keeper list', async function () {
        await pool.addKeeper(user1.address)
        await pool.removeKeeper(user1.address)
        expect((await pool.keepers()).length).to.be.equal(1, 'Address removed successfully')
      })

      it('Governor should be able to add keeper in empty list', async function () {
        const keepers = await pool.keepers()
        for (const keeper of keepers) {
          await pool.removeKeeper(keeper)
        }
        expect((await pool.keepers()).length).to.be.equal(0, 'Address removed successfully')
        await expect(pool.connect(user3.signer).addKeeper(user1.address)).to.be.revertedWith('not-a-keeper')
        await pool.addKeeper(user2.address) // default user is governor
        expect((await pool.keepers()).length).to.be.equal(1, 'Keeper added successfully')
      })

      it('Should revert if address not in list', async function () {
        await expect(pool.removeKeeper(user1.address)).to.be.revertedWith('14')
      })

      it('Should revert if non-keeper users add in keeper', async function () {
        await expect(pool.connect(user3.signer).addKeeper(user1.address)).to.be.revertedWith('not-a-keeper')
      })
    })
  })

  describe('Keeper operations', function () {
    beforeEach(async function () {
      await pool.addKeeper(user1.address)
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
    beforeEach(async function () {
      await pool.addKeeper(user1.address)
    })

    context('Add address in maintainer list', function () {
      it('Admin can add/remove address in maintainer list', async function () {
        await pool.addMaintainer(user2.address)
        expect((await pool.maintainers()).length).to.be.equal(2, 'Address added successfully')
        await pool.connect(user1.signer).removeMaintainer(user2.address)
        expect((await pool.maintainers()).length).to.be.equal(1, 'Address removed successfully')
      })

      it('Keeper can add/remove address in maintainer list', async function () {
        await pool.connect(user1.signer).addMaintainer(user3.address)
        expect((await pool.maintainers()).length).to.be.equal(2, 'Address added successfully')

        await pool.connect(user1.signer).removeMaintainer(user3.address)
        expect((await pool.maintainers()).length).to.be.equal(1, 'Address removed successfully')
      })

      it('Governor should be able to add maintainer in empty list', async function () {
        const maintainers = await pool.maintainers()
        for (const maintainer of maintainers) {
          await pool.removeMaintainer(maintainer)
        }
        expect((await pool.maintainers()).length).to.be.equal(0, 'Address removed successfully')
        await expect(pool.connect(user3.signer).addMaintainer(user1.address)).to.be.revertedWith('not-a-keeper')
        await pool.addMaintainer(user2.address) // default user is governor
        expect((await pool.maintainers()).length).to.be.equal(1, 'Keeper added successfully')
      })

      it('Should revert if address already exist in list', async function () {
        await pool.addMaintainer(user2.address)
        await expect(pool.connect(user1.signer).addMaintainer(user2.address)).to.be.revertedWith('13')
      })

      it('Should revert if not authorized users add in maintainer', async function () {
        await expect(pool.connect(user3.signer).addMaintainer(user4.address)).to.be.revertedWith('not-a-keeper')
      })
    })
  })

  describe('Migrate strategy', function () {
    it('Should migrate strategy', async function () {
      const config = AaveStrategyDAI.config
      await accountant.addStrategy(strategy.address, ...Object.values(config))
      const newStrategy = await createStrategy(AaveStrategyDAI, pool.address)
      const tx = pool.migrateStrategy(strategy.address, newStrategy.address)
      await expect(tx)
        .to.emit(accountant, 'StrategyMigrated')
        .withArgs(strategy.address, newStrategy.address, config.debtRatio, config.debtRate, config.externalDepositFee)
      expect((await accountant.strategy(newStrategy.address)).active, 'Strategy should be active').to.be.true
      expect((await accountant.strategy(strategy.address)).active, 'Old strategy should be de-active').to.be.false
    })

    it('Should migrate strategy and replace in strategies array', async function () {
      await accountant.addStrategy(strategy.address, ...Object.values(AaveStrategyDAI.config))
      const newStrategy = await createStrategy(AaveStrategyDAI, pool.address)
      expect(await accountant.strategies(0)).to.be.eq(strategy.address, 'strategies[0] should be old strategy')
      await pool.migrateStrategy(strategy.address, newStrategy.address)
      expect(await accountant.strategies(0)).to.be.eq(newStrategy.address, 'strategies[0] should be new strategy')
    })

    it('Should revert if strategy is invalid', async function () {
      await accountant.addStrategy(strategy.address, ...Object.values(AaveStrategyDAI.config))
      const pool2 = await deployContract(VDAI.contractName, VDAI.poolParams)
      const newStrategy = await createStrategy(AaveStrategyDAI, pool2.address)
      const tx = pool.migrateStrategy(strategy.address, newStrategy.address)
      // 17 = INVALID_STRATEGY
      await expect(tx).to.be.revertedWith('17', 'Strategies has different pool')
    })

    it('Should revert if old strategy is not active', async function () {
      const newStrategy = await createStrategy(AaveStrategyDAI, pool.address)
      const tx = pool.migrateStrategy(strategy.address, newStrategy.address)
      // 16 = STRATEGY_IS_NOT_ACTIVE
      await expect(tx).to.be.revertedWith('16', 'Old strategy is not active')
    })

    it('Should revert if new strategy is active', async function () {
      const config = AaveStrategyDAI.config
      config.debtRatio = '5000'
      await accountant.addStrategy(strategy.address, ...Object.values(config))
      const newStrategy = await createStrategy(AaveStrategyDAI, pool.address)
      config.debtRatio = '4000'
      await accountant.addStrategy(newStrategy.address, ...Object.values(config))
      const tx = pool.migrateStrategy(strategy.address, newStrategy.address)
      // 15 = STRATEGY_IS_ACTIVE
      await expect(tx).to.be.revertedWith('15', 'New strategy is already active')
    })
  })
})
