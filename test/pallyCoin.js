const assert = require('assert')
const PallyCoin = artifacts.require('PallyCoin')
const Crowdsale = artifacts.require('Crowdsale')
let tokenInstance = {}
let crowdsaleInstance = {}

/**
 * 1. Set the crowdsale address for the token instance
 * 2. Set the tier rates for the crowdsale instance
 * 3. Use it.
 */
contract('PallyCoin', accounts => {

   // It'll be used accross several functions
   const rateTier1 = 5000
   const rateTier2 = 4000
   const rateTier3 = 3000
   const rateTier4 = 2000

   before(cb => {
      console.log('Preparing contracts for the tests...')

      crowdsaleInstance = web3.eth.contract(Crowdsale.abi).at(Crowdsale.address)
      tokenInstance = web3.eth.contract(PallyCoin.abi).at(crowdsaleInstance.token())
      crowdsaleInstance.setTierRates(rateTier1, rateTier2, rateTier3, rateTier4, {
         from: web3.eth.accounts[0],
         gas: 3000000
      }, (err, result) => {

         cb()
      })
   })

   it("Should set the crowdsale address correctly", cb => {
      tokenInstance.setCrowdsaleAddress(crowdsaleInstance.address, {
         from: web3.eth.accounts[0],
         gas: 4000000
      }, (err, result) => {
         setTimeout(() => {
            tokenInstance.crowdsale((err, crowdsaleAddress) => {
               console.log("Crowdsale address " + crowdsaleAddress)

               assert.equal(crowdsaleAddress, crowdsaleInstance.address, "The crowdsale address is not correctly set")

               cb()
            })
         }, 3e3)
      })
   })

   it("Should distribute presale tokens correctly", cb => {
      const wallet = web3.eth.accounts[0]
      const initialTokenBalance = 40e6
      const tokensToBuy1 = 1e6
      const tokensToBuy2 = 5e6

      tokenInstance.distributePresaleTokens(web3.eth.accounts[0], tokensToBuy1, {
         from: web3.eth.accounts[0],
         gas: 4e6
      }, (err, response) => {
         setTimeout(() => {
            tokenInstance.balanceOf(web3.eth.accounts[0], (err, balance1) => {
               balance1 = parseInt(balance1)

               tokenInstance.distributePresaleTokens(web3.eth.accounts[0], tokensToBuy2, {
                  from: web3.eth.accounts[0],
                  gas: 4e6
               }, (err, response) => {
                  setTimeout(() => {
                     tokenInstance.balanceOf(web3.eth.accounts[0], (err, balance2) => {
                        balance2 = parseInt(balance2)

                        assert.equal(balance1, (initialTokenBalance + tokensToBuy1), "The token balance is not correct")
                        assert.equal(balance2, (initialTokenBalance + tokensToBuy1 + tokensToBuy2), "The token balance is not correct")

                        cb()
                     })
                  }, 3e3)
               })
            })
         }, 3e3)
      })
   })
})
