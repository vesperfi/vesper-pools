'use strict'

const { expect } = require('chai')
const hre = require('hardhat')
const ethers = hre.ethers
const { deployContract, createStrategy } = require('./utils/setupHelper')
const Address = require('../helper/mainnet/address')
const addressListFactory = hre.address.ADDRESS_LIST_FACTORY
const StrategyType = require('./utils/strategyTypes')
const VDAI = require('../helper/mainnet/poolConfig').VDAI

describe('Pool accountant proxy', function () {
  const oneMillion = ethers.utils.parseEther('1000000')
  let pool, strategy, accountant
  let governor, user1

  const strategyConfig = {
    name: 'AaveStrategyDAI',
    type: StrategyType.AAVE,
    config: { interestFee: '1500', debtRatio: 9000, debtRate: oneMillion, externalDepositFee: 500 },
  }

  beforeEach(async function () {
    ;[governor, user1] = await ethers.getSigners()
    pool = await deployContract(VDAI.contractName, VDAI.poolParams)
    accountant = await deployContract('PoolAccountant')
    await accountant.init(pool.address)
    await pool.initialize(...VDAI.poolParams, accountant.address, addressListFactory)

    strategyConfig.feeCollector = user1.address
    strategy = await createStrategy(strategyConfig, pool.address, { addressListFactory })
  })

  describe('Add strategy tests', function () {
    it('Should add strategy', async function () {
      const config = strategyConfig.config
      const tx = accountant.connect(governor).addStrategy(strategy.address, ...Object.values(config))
      await expect(tx)
        .to.emit(accountant, 'StrategyAdded')
        .withArgs(strategy.address, ...Object.values(config))
      await expect(tx).to.emit(accountant, 'UpdatedPoolExternalDepositFee').withArgs(0, config.externalDepositFee)

      expect((await accountant.strategy(strategy.address)).active, 'Strategy should be active').to.true
      expect(await accountant.externalDepositFee()).to.eq(
        strategyConfig.config.externalDepositFee,
        'Incorrect pool external deposit fee',
      )
    })

    it('Should revert if strategy is already active', async function () {
      await accountant.connect(governor).addStrategy(strategy.address, ...Object.values(strategyConfig.config))
      const tx = accountant.connect(governor).addStrategy(strategy.address, ...Object.values(strategyConfig.config))
      // 15 = STRATEGY_IS_ACTIVE
      await expect(tx).to.revertedWith('15', 'Strategy is already active')
    })

    it('Should revert if strategy address is zero', async function () {
      const tx = accountant.connect(governor).addStrategy(Address.ZERO, ...Object.values(strategyConfig.config))
      // 10 = INPUT_ADDRESS_IS_ZERO
      await expect(tx).to.revertedWith('10', 'Strategy address is zero')
    })

    it('Should revert if debt ratio is above limit', async function () {
      const config = { interestFee: '1500', debtRatio: '10001', debtRate: oneMillion, externalDepositFee: '1000' }
      const tx = accountant.connect(governor).addStrategy(strategy.address, ...Object.values(config))
      // 18 = DEBT_RATIO_LIMIT_REACHED, Limit is 10,000
      await expect(tx).to.revertedWith('18', 'Input debt ratio is above max limit')
    })

    it('Should revert if interest fee is above limit', async function () {
      const config = { interestFee: '15000', debtRatio: '9000', debtRate: oneMillion, externalDepositFee: '1000' }
      const tx = accountant.connect(governor).addStrategy(strategy.address, ...Object.values(config))
      // 11 = FEE_LIMIT_REACHED, Limit is 10,000
      await expect(tx).to.revertedWith('11', 'Input interest fee is above max limit')
    })

    it('Should revert if external deposit fee is above limit', async function () {
      const config = { interestFee: '1500', debtRatio: '9000', debtRate: oneMillion, externalDepositFee: '10001' }
      const tx = accountant.connect(governor).addStrategy(strategy.address, ...Object.values(config))
      // 11 = FEE_LIMIT_REACHED, Limit is 10,000
      await expect(tx).to.revertedWith('11', 'Input external deposit fee is above max limit')
    })
  })

  // TODO
  describe('Remove strategy tests', function () {})

  describe('Update external deposit fee tests', function () {
    beforeEach(async function () {
      await accountant.connect(governor).addStrategy(strategy.address, ...Object.values(strategyConfig.config))
    })

    it('Should revert if strategy is not active', async function () {
      // Send fake address as strategy
      const tx = accountant.connect(governor).updateExternalDepositFee(Address.ANY_ERC20, 600)
      // 16= STRATEGY_IS_NOT_ACTIVE
      await expect(tx).to.revertedWith('16', 'Strategy is not active')
    })
    it('Should revert if external deposit fee is above limit', async function () {
      const tx = accountant.connect(governor).updateExternalDepositFee(strategy.address, 10001)
      // 11 = FEE_LIMIT_REACHED, Limit is 10,000
      await expect(tx).to.revertedWith('11', 'Input external deposit fee is above max limit')
    })

    it('Should update external deposit fee', async function () {
      expect(await accountant.externalDepositFee()).to.eq(
        strategyConfig.config.externalDepositFee,
        'incorrect pool external deposit fee',
      )

      const tx = accountant.connect(governor).updateExternalDepositFee(strategy.address, 800)
      await expect(tx)
        .to.emit(accountant, 'UpdatedExternalDepositFee')
        .withArgs(strategy.address, strategyConfig.config.externalDepositFee, 800)

      expect((await accountant.strategy(strategy.address)).externalDepositFee).to.eq(
        800,
        'incorrect external deposit fee',
      )
      expect(await accountant.externalDepositFee()).to.eq(800, 'incorrect pool external deposit fee')
    })
  })

  // TODO
  describe('Update interest fee tests', function () {})

  // TODO
  describe('Update debt rate tests', function () {})

  // TODO
  describe('Update debt ratio tests', function () {})

  // TODO
  describe('Update withdraw queue tests', function () {})

  describe('Pool external deposit fee tests', function () {
    let initialPoolExternalDepositFee, strategy2, config
    beforeEach(async function () {
      await accountant.connect(governor).addStrategy(strategy.address, ...Object.values(strategyConfig.config))
      initialPoolExternalDepositFee = await accountant.externalDepositFee()
      config = { interestFee: 1500, debtRatio: 500, debtRate: oneMillion, externalDepositFee: 1000 }
      strategy2 = await createStrategy({ config, ...strategyConfig }, pool.address, { addressListFactory })
    })

    it('Should calculate fee @ addStrategy', async function () {
      await accountant.connect(governor).addStrategy(strategy2.address, ...Object.values(config))
      const poolExternalDepositFee = await accountant.externalDepositFee()
      expect(poolExternalDepositFee).to.gt(initialPoolExternalDepositFee, 'Updated fee should be > fee before')
    })

    it('Should calculate fee @ removeStrategy', async function () {
      await accountant.connect(governor).addStrategy(strategy2.address, ...Object.values(config))
      // Removing 1st strategy. It will update pool external deposit fee to equal to 2nd strategy external deposit fee
      await accountant.connect(governor).removeStrategy(0)
      expect(await accountant.externalDepositFee()).to.eq(
        config.externalDepositFee,
        'Final fee should be = 2nd strategy externalDepositFee',
      )
    })

    it('Should calculate fee @ updateDebtRatio', async function () {
      await accountant.connect(governor).addStrategy(strategy2.address, ...Object.values(config))
      const poolExternalDepositFee2 = await accountant.externalDepositFee()
      const totalDebtRatio = await accountant.totalDebtRatio()

      // Reducing debt ratio of 1st strategy. This will increase pool external deposit fee
      await accountant.connect(governor).updateDebtRatio(strategy.address, 5000)

      expect(await accountant.externalDepositFee()).to.gt(
        poolExternalDepositFee2,
        'Final fee should be > 2 strategy externalDepositFee',
      )
      expect(await accountant.totalDebtRatio()).to.lt(totalDebtRatio, 'Incorrect total debt ratio')
    })

    it('Should calculate fee @ updateExternalDepositFee', async function () {
      await accountant.connect(governor).addStrategy(strategy2.address, ...Object.values(config))
      const poolExternalDepositFeeBefore = await accountant.externalDepositFee()
      // Reducing external deposit fee of 2nd strategy. It will reduce pool external deposit fee
      await accountant.connect(governor).updateExternalDepositFee(strategy2.address, 600)
      expect(await accountant.externalDepositFee()).to.lt(
        poolExternalDepositFeeBefore,
        'Final fee should be < external deposit fee before',
      )
    })
  })
})
