'use strict'
// Prepare gnosis transaction initiation refer: https://docs.gnosis-safe.io/tutorials/tutorial_tx_service_initiate_sign
const ethers = require('ethers')
const Wallet = ethers.Wallet
const axios = require('axios')
const { utils } = ethers
const gnosisAbi = require('./abis/gnosisAbi.json')
const { encodeMulti } = require('ethers-multisend')

const getBaseUrl = function (targetChain) {
  return `https://safe-transaction.${targetChain}.gnosis.io`
}

const isDeployerADelegate = async function (safe, deployer, targetChain) {
  const {
    data: { count, results },
  } = await axios.get(`${getBaseUrl(targetChain)}/api/v1/safes/${safe}/delegates`)
  if (count === 0) return false
  const delegates = results.map(r => r.delegate)
  return delegates.includes(deployer)
}

const getNextNonce = async function (safe, targetChain) {
  const nonce = (await axios.get(`${getBaseUrl(targetChain)}/api/v1/safes/${safe}`)).data.nonce
  const url = `${getBaseUrl(
    targetChain,
  )}/api/v1/safes/${safe}/multisig-transactions/?executed=false&nonce__gte=${nonce}`
  const pendingTxs = (await axios.get(url)).data.results
  if (pendingTxs && pendingTxs.length > 0) {
    const nonces = pendingTxs.map(tx => tx.nonce)
    const lastNonce = Math.max(...nonces)
    return lastNonce + 1
  }
  return nonce + 1
}

function getProvider() {
  return new ethers.providers.JsonRpcProvider(process.env.NODE_URL)
}

function getGnosisContract(safe) {
  return new ethers.Contract(safe, gnosisAbi, getProvider())
}

async function isDelegateOrOwner(safe, deployer, targetChain) {
  const multiSigContract = getGnosisContract(safe)
  const signers = await multiSigContract.getOwners()
  const isDelegate = await isDeployerADelegate(safe, deployer, targetChain)
  return signers.includes(deployer) || isDelegate
}

const gnosisProposeTx = async function (safe, tx, targetChain) {
  return axios.post(`${getBaseUrl(targetChain)}/api/v1/safes/${safe}/multisig-transactions/`, tx)
}

const getSafeCompatibleSignature = async function (transactionHash) {
  const wallet = Wallet.fromMnemonic(process.env.MNEMONIC)
  wallet.connect(getProvider())
  const typedDataHash = utils.arrayify(transactionHash)
  // refer https://github.com/gnosis/safe-contracts/blob/main/src/utils/execution.ts#L97
  return (await wallet.signMessage(typedDataHash)).replace(/1b$/, '1f').replace(/1c$/, '20')
}

/**
 * Base transaction
 *
 * @typedef BaseTxn
 * @property {number} operation type of operation call or delegateCall
 * @property {string} to        target address
 * @property {number} value      eth value
 * @property {string} data      transaction data, usually generation using populateTransaction
 */

/**
 * Gnosis transaction definition
 *
 * @typedef GnosisTxn
 *
 * @property {BaseTxn} baseTxn        basic transaction data
 * @property {string} safe           gnosis safe address
 * @property {string} nonce          gnosis nonce
 * @property {string} sender         caller, usually deployer
 * @property {string} targetChain    target chain
 */

/**
 * Submit transaction using gnosis
 *
 * @param {GnosisTxn} txnData data for gnosis transaction
 */
const submitGnosisTxn = async function (txnData) {
  const { baseTxn, safe, nonce, sender, targetChain } = txnData
  const txn = {
    ...baseTxn,
    safeTxGas: 0,
    baseGas: 0,
    gasPrice: 0,
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
  console.log('Transaction data', toSend)
  await gnosisProposeTx(safe, toSend, targetChain)
}

async function proposeTxn(targetChain, deployer, multisigNonce = 0, transaction) {
  const Address = require(`../helper/${targetChain}/address`)
  const safe = Address.MultiSig.safe
  const nonce = multisigNonce === 0 ? await getNextNonce(safe, targetChain) : multisigNonce
  const txnParams = { baseTxn: transaction, safe, nonce, sender: deployer, targetChain }
  await submitGnosisTxn(txnParams)
}

async function proposeMultiTxn(targetChain, deployer, multisigNonce = 0, transactions) {
  const Address = require(`../helper/${targetChain}/address`)
  const safe = Address.MultiSig.safe

  const txn = encodeMulti(transactions)
  const baseTxn = {
    operation: txn.operation,
    to: txn.to,
    value: 0,
    data: txn.data || '0x',
  }
  const nonce = multisigNonce === 0 ? await getNextNonce(safe, targetChain) : multisigNonce
  const txnParams = { baseTxn, safe, nonce, sender: deployer, targetChain }
  await submitGnosisTxn(txnParams)
}

module.exports = {
  isDelegateOrOwner,
  submitGnosisTxn,
  getNextNonce,
  proposeTxn,
  proposeMultiTxn,
}
