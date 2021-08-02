'use strict'

const {ethers} = require('hardhat')

const {prepareConfig} = require('./config')
const {
    deposit: _deposit,
    rebalance,
    timeTravel,
} = require('../utils/poolOps')
const StrategyType = require('../utils/strategyTypes')

describe('VRF Compound strategy', function () {
    let user1
    let pool, strategies, collateralToken

    async function deposit(amount, depositor) {
        return _deposit(pool, collateralToken, amount, depositor)
    }

    before(async function () {
        await prepareConfig([
            {
                name: 'CompoundStrategyDAI',
                type: StrategyType.COMPOUND,
                config: {
                    interestFee: 1500,
                    debtRatio: 10000,
                    debtRate: ethers.utils.parseEther('1000000')
                },
            },
        ])
    })

    beforeEach(function () {
        ;[, user1,] = this.users

        pool = this.pool
        strategies = this.strategies
        collateralToken = this.collateralToken
    })

    it('2% APY', async function () {
        await deposit(10, user1)

        await pool.startVFR(200)
        await timeTravel(10 * 24 * 3600)

        for (let i = 0; i < 10; i++) {
            await timeTravel(0, 100, 'compound')
            await rebalance(strategies)

            const currentPricePerShare = (await pool.pricePerShare()).toString()
            const targetPricePerShare = (await pool.targetPricePerShare()).toString()
            console.log(`currentPPS = ${currentPricePerShare}, targetPPS = ${targetPricePerShare}`)
        }
    })
})
