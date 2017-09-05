var PallyCoin = artifacts.require("./PallyCoin.sol");
var Crowdsale = artifacts.require("./Crowdsale.sol");

module.exports = function(deployer, network) {
   if(network != 'live'){

      console.log('Deploying contracts...')

      // Deploy the token
      deployer.then(() => {
         return PallyCoin.new()
      }).then(tokenInstance => {
         return deployer.deploy(
            Crowdsale,
            web3.eth.accounts[0],
            tokenInstance.address
         )
      })
   }
}
