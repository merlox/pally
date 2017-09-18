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

   // Create new token and crowdsale contract instances for each test
   beforeEach(async () => {
      tokenInstance = await PallyCoin.new()

      const startTime = Math.floor(new Date().getTime() / 1000)
      crowdsaleInstance = await Crowdsale.new(web3.eth.accounts[0], tokenInstance.address, startTime, 0, {
         from: web3.eth.accounts[0],
         gas: 4e6
      })

      await tokenInstance.setCrowdsaleAddress(crowdsaleInstance.address, {
         from: web3.eth.accounts[0],
         gas: 4e6
      })

      await crowdsaleInstance.setTierRates(rateTier1, rateTier2, rateTier3, rateTier4, {
         from: web3.eth.accounts[0],
         gas: 4e6
      })
   })

   it("Should set the crowdsale address correctly", () => {
      return new Promise(async (resolve, reject) => {
         const crowdsaleAddress = await tokenInstance.crowdsale()
         assert.equal(crowdsaleAddress, crowdsaleInstance.address, "The crowdsale address is not correctly set")

         resolve()
      })
   })

   it("Should distribute presale tokens correctly", () => {
      return new Promise(async (resolve, reject) => {
         const wallet = web3.eth.accounts[0]
         const initialTokenBalance = new web3.BigNumber(40e24)
         const tokensToBuy1 = new web3.BigNumber(1e24)
         const tokensToBuy2 = new web3.BigNumber(5e24)

         await tokenInstance.distributePresaleTokens(web3.eth.accounts[0], tokensToBuy1, {
            from: web3.eth.accounts[0],
            gas: 4e6
         })

         const secondTokenBalance = await tokenInstance.balanceOf(web3.eth.accounts[0])
         await tokenInstance.distributePresaleTokens(web3.eth.accounts[0], tokensToBuy2, {
            from: web3.eth.accounts[0],
            gas: 4e6
         })

         const finalTokenBalance = await tokenInstance.balanceOf(web3.eth.accounts[0])

         assert.ok(secondTokenBalance.eq(initialTokenBalance.add(tokensToBuy1)), "The second token balance is not correct")
         assert.ok(finalTokenBalance.eq(secondTokenBalance.add(tokensToBuy2)), "The final token balance is not correct")

         resolve()
      })
   })
})
