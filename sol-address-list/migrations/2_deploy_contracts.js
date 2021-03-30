let AddressListFactory = artifacts.require("AddressListFactory")
module.exports = async function (deployer, network) {
    try {
        await deployer.deploy(AddressListFactory)
    } catch (e) {
        console.log(`Error in migration: ${e.message}`)
    }
}
