'use strict'
// Prepare gnosis transaction initiation refer: https://docs.gnosis-safe.io/tutorials/tutorial_tx_service_initiate_sign
const ethers = require('ethers')
const Wallet = ethers.Wallet
const axios = require('axios')
const { utils } = ethers
const gnosisAbi = require('./abis/gnosisAbi.json')
const safeTxnURL = 'https://safe-transaction.mainnet.gnosis.io'
const safeRelayURL = 'https://safe-relay.mainnet.gnosis.io'

const gnosisEstimateTransaction = async function (safe, tx) {
  return (await axios.post(`${safeRelayURL}/api/v2/safes/${safe}/transactions/estimate/`, tx)).data
}

const isDeployerADelegate = async function (safe, deployer) {
  const {
    data: { count, results },
  } = await axios.get(`${safeTxnURL}/api/v1/safes/${safe}/delegates`)
  if (count === 0) return false
  const delegates = results.map(r => r.delegate)
  return delegates.includes(deployer)
}

const getMultiSigNonce = async function (safe) {
  return (await axios.get(`${safeRelayURL}/api/v1/safes/${safe}`)).data
}

function getProvider() {
  return new ethers.providers.JsonRpcProvider(process.env.NODE_URL)
}

function getGnosisContract(safe) {
  return new ethers.Contract(safe, gnosisAbi, getProvider())
}

async function isMultiSig(governor, safe, deployer) {
  const multiSigContract = getGnosisContract(safe)
  const signers = await multiSigContract.getOwners()
  const isDelegate = await isDeployerADelegate(safe, deployer)
  return governor === safe && (signers.includes(deployer) || isDelegate)
}

const gnosisProposeTx = async function (safe, tx) {
  return axios.post(`${safeTxnURL}/api/v1/safes/${safe}/multisig-transactions/`, tx)
}

const getSafeCompatibleSignature = async function (transactionHash) {
  const wallet = Wallet.fromMnemonic(process.env.MNEMONIC)
  wallet.connect(getProvider())
  const typedDataHash = utils.arrayify(transactionHash)
  // refer https://github.com/gnosis/safe-contracts/blob/main/src/utils/execution.ts#L97
  return (await wallet.signMessage(typedDataHash)).replace(/1b$/, '1f').replace(/1c$/, '20')
}

/**
 * Submit transaction using gnosis.
 *
 * @param {string} safe           gnosis safe address
 * @param {string} to             receiver / target contract address
 * @param {string} data           target contract method encoded data (prepared using populateTransaction)
 * @param {string} nonce          gnosis nonce
 */
const submitGnosisTxn = async function ({ safe, to, data, nonce, sender }) {
  const baseTxn = {
    to: utils.getAddress(to),
    value: 0,
    data: data || '0x',
    operation: 0,
  }

  // Safe service estimate the tx and retrieve the nonce
  const { safeTxGas } = await gnosisEstimateTransaction(safe, baseTxn)

  const txn = {
    ...baseTxn,
    safeTxGas,
    baseGas: 0,
    gasPrice: 1000000006,
    // Required gas-price>=1000000006 with gas-token=0x0000000000000000000000000000000000000000"
    gasToken: ethers.constants.AddressZero,
    refundReceiver: ethers.constants.AddressZero,
    nonce,
  }

  const gnosisSafe = getGnosisContract(safe)
  const contractTransactionHash = await gnosisSafe.getTransactionHash(
    txn.to,
    txn.value,
    txn.data,
    txn.operation,
    txn.safeTxGas,
    txn.baseGas,
    txn.gasPrice,
    ethers.constants.AddressZero,
    ethers.constants.AddressZero,
    nonce,
  )
  const signature = await getSafeCompatibleSignature(contractTransactionHash)
  const toSend = {
    ...txn,
    contractTransactionHash,
    signature,
    sender,
  }
  console.log({ toSend })
  await gnosisProposeTx(safe, toSend)
}

module.exports = {
  isMultiSig,
  submitGnosisTxn,
  getMultiSigNonce,
}
