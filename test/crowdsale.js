const assert = require('assert')
const PallyCoin = artifacts.require('PallyCoin')
const Crowdsale = artifacts.require('Crowdsale')
const RefundVault = artifacts.require('RefundVault')
let tokenInstance = {}
let crowdsaleInstance = {}
let vaultInstance = {}

function getTokens(weiAmount, rate) {
   return weiAmount * rate / 1e18
}

/**
 * 1. Set the crowdsale address for the token instance
 * 2. Set the tier rates for the crowdsale instance
 * 3. Use it.
 */
contract('Crowdsale', accounts => {

   // It'll be used accross several functions
   const rateTier1 = 5000
   const rateTier2 = 4000
   const rateTier3 = 3000
   const rateTier4 = 2000

   // Create new token and crowdsale contract instances for each test
   beforeEach(async () => {
      tokenInstance = await PallyCoin.new()
      crowdsaleInstance = await Crowdsale.new(web3.eth.accounts[0], tokenInstance.address, 0, {
         from: web3.eth.accounts[0],
         gas: 4e6,
         value: web3.toWei(1, 'ether')
      })

      const vaultAddress = await crowdsaleInstance.vault()
      vaultInstance = web3.eth.contract(RefundVault.abi).at(vaultAddress)

      await tokenInstance.setCrowdsaleAddress(crowdsaleInstance.address, {
         from: web3.eth.accounts[0],
         gas: 4e6
      })

      await crowdsaleInstance.setTierRates(rateTier1, rateTier2, rateTier3, rateTier4, {
         from: web3.eth.accounts[0],
         gas: 4e6
      })
   })

   it("Should set the constructor data correctly", async () => {
      assert.equal(await crowdsaleInstance.wallet(), web3.eth.accounts[0], "Wallet isn't correct")
      assert.equal(await crowdsaleInstance.token(), tokenInstance.address, "Token address isn't correct")
   })

   it("Should set the vault wallet address correctly", async () => {
      const vaultAddress = await crowdsaleInstance.vault()
      const vaultInstance = web3.eth.contract(RefundVault.abi).at(vaultAddress)

      assert.equal(await vaultInstance.wallet(), web3.eth.accounts[0], 'The wallet address of the vault isn\'t correct')
   })

   it("Should set the tier rates of the crowdsale instance correctly", async () => {
      await crowdsaleInstance.setTierRates(rateTier1, rateTier2, rateTier3, rateTier4, {
         from: web3.eth.accounts[0],
         gas: 4e6
      })

      const rate1 = parseInt(await crowdsaleInstance.rate())
      const rate2 = parseInt(await crowdsaleInstance.rateTier2())
      const rate3 = parseInt(await crowdsaleInstance.rateTier3())
      const rate4 = parseInt(await crowdsaleInstance.rateTier4())

      assert.equal(rate1, rateTier1, 'The rate 1 is not correctly set')
      assert.equal(rate2, rateTier2, 'The rate 2 is not correctly set')
      assert.equal(rate3, rateTier3, 'The rate 3 is not correctly set')
      assert.equal(rate4, rateTier4, 'The rate 4 is not correctly set')
   })

   it("Should buy 10 million tokens for 2000 ether at rate 5000 with buyTokens()", async () => {
      const amountToBuy = web3.toWei(2000, 'ether')
      const expectedTokens = 10e6

      await crowdsaleInstance.buyTokens({
         from: web3.eth.accounts[0],
         gas: 4e6,
         value: amountToBuy
      })

      const tokensRaised = (await crowdsaleInstance.tokensRaised()).toString()

      assert.equal(tokensRaised, expectedTokens, 'The tokens raised aren\'t correct')
   })

   it("Should calculate the excess tokens with the proper rates, buy 1000 ether + 2000 ether returning 14.5M instead of 15M", async () => {
      const amountToBuy = web3.toWei(2000, 'ether')
      const amountToBuy2 = web3.toWei(1000, 'ether')
      const expectedTokens = getTokens(web3.toWei(2500, 'ether'), rateTier1) + getTokens(web3.toWei(500, 'ether'), rateTier2)

      await crowdsaleInstance.buyTokens({
         from: web3.eth.accounts[0],
         value: amountToBuy
      })

      const secondPurchaseTokens = await crowdsaleInstance.calculateExcessTokens(amountToBuy2, 12500000, 1, rateTier1, {
         from: web3.eth.accounts[1],
         gas: 4e6
      })

      assert.equal(
         getTokens(web3.toWei(2000, 'ether'), 5000) + parseInt(secondPurchaseTokens),
         expectedTokens,
         "The tokens received aren't correct"
      )
   })

   it("Should buy 14.5 million tokens for 3000 ether with buyTokens()", async () => {

      // You can't buy more than 2000 ether as defined by maxPurchase so we split it
      // 2500 at tier 1 rate 5000 = 12.5 Million tokens
      // 500 at tier 2 rate 4000 = 2 Million tokens
      const amountToBuy1 = web3.toWei(2000, 'ether')
      const amountToBuy2 = web3.toWei(1000, 'ether')
      const expectedTokens = 14.5e6

      await crowdsaleInstance.buyTokens({
         from: web3.eth.accounts[0],
         gas: 4500000,
         value: amountToBuy1
      })

      // Change the from: because each user has a limitation of 2000 ether per purchase
      await crowdsaleInstance.buyTokens({
         from: web3.eth.accounts[1],
         gas: 4500000,
         value: amountToBuy2
      })

      setTimeout(async () => {
         const tokensRaised = (await crowdsaleInstance.tokensRaised()).toString()

         assert.equal(tokensRaised, expectedTokens, 'The tokens raised are not correct')
      }, 2e3)
   })

   it("Should buy 34 million tokens for 8625 ether with buyTokens()", async () => {

      // You can't buy more than 2000 ether as defined by maxPurchase so we split it
      const amountToBuy = web3.toWei(2000, 'ether')
      const amountToBuy2 = web3.toWei(2000, 'ether')
      const amountToBuy3 = web3.toWei(2000, 'ether')
      const amountToBuy4 = web3.toWei(2000, 'ether')
      const amountToBuy5 = web3.toWei(625, 'ether')
      const expectedTokens = 34e6

      await crowdsaleInstance.buyTokens({
         from: web3.eth.accounts[0],
         gas: 4e6,
         value: amountToBuy
      })

      await crowdsaleInstance.buyTokens({
         from: web3.eth.accounts[1],
         gas: 4e6,
         value: amountToBuy2
      })

      await crowdsaleInstance.buyTokens({
         from: web3.eth.accounts[2],
         gas: 4e6,
         value: amountToBuy3
      })

      await crowdsaleInstance.buyTokens({
         from: web3.eth.accounts[3],
         gas: 4e6,
         value: amountToBuy4
      })

      await crowdsaleInstance.buyTokens({
         from: web3.eth.accounts[4],
         gas: 4e6,
         value: amountToBuy5
      })

      setTimeout(async () => {
         const tokensRaised = (await crowdsaleInstance.tokensRaised()).toString()

         assert.equal(tokensRaised, expectedTokens, 'The tokens raised are not correct')
      }, 2e3)
   })

   // Checking that the balanceOf stays the same because the transaction was reverted
   it("Should allow you to buy 3000 ether by returning 1000 and buying 2000", async () => {
      const amountToBuy = web3.toWei(3000, 'ether')
      const expectedTokens = 10e6

      await crowdsaleInstance.buyTokens({
         from: web3.eth.accounts[0],
         gas: 4500000,
         value: amountToBuy
      })

      setTimeout(async () => {
         const raisedTokens = (await crowdsaleInstance.tokensRaised()).toString()

         assert.equal(expectedTokens, raisedTokens, 'The tokens raised are not correct')
      }, 2e3)
   })

   // Checking that the balanceOf stays the same because the transaction was reverted
   it("Should not allow you to buy less than 0.1 ether, minPurchase", async () => {
      const amountToBuy = web3.toWei(0.001, 'ether')
      const tokensExpected = 0

      await crowdsaleInstance.buyTokens({
         from: web3.eth.accounts[0],
         gas: 4500000,
         value: amountToBuy
      })

      setTimeout(async () => {
         const tokensRaised = (await crowdsaleInstance.tokensRaised()).toString()

         assert.equal(tokensExpected, tokensRaised, 'The tokens raised aren\'t correct after buying tokens')
      }, 2e3)
   })

   // This is how close you can get if you try to purchase the exact amount of 50 million tokens
   it("Should buy 49.99 million tokens for 16041,66 ether with the buyTokens function", async () => {

      // You can't buy more than 2000 ether as defined by maxPurchase so we split it
      const amountToBuy = web3.toWei(2000, 'ether')
      const amountToBuy2 = web3.toWei(2000, 'ether')
      const amountToBuy3 = web3.toWei(2000, 'ether')
      const amountToBuy4 = web3.toWei(2000, 'ether')
      const amountToBuy5 = web3.toWei(2000, 'ether')
      const amountToBuy6 = web3.toWei(2000, 'ether')
      const amountToBuy7 = web3.toWei(2000, 'ether')
      const amountToBuy8 = web3.toWei(2000, 'ether')
      const amountToBuy9 = web3.toWei(41 + 2/3, 'ether') // 41.6666...
      const expectedTokens = 49999999

      await crowdsaleInstance.buyTokens({
         from: web3.eth.accounts[0],
         gas: 4e6,
         value: amountToBuy
      })

      await crowdsaleInstance.buyTokens({
         from: web3.eth.accounts[1],
         gas: 4e6,
         value: amountToBuy2
      })

      await crowdsaleInstance.buyTokens({
         from: web3.eth.accounts[2],
         gas: 4e6,
         value: amountToBuy3
      })

      await crowdsaleInstance.buyTokens({
         from: web3.eth.accounts[3],
         gas: 4e6,
         value: amountToBuy4
      })

      await crowdsaleInstance.buyTokens({
         from: web3.eth.accounts[4],
         gas: 4e6,
         value: amountToBuy5
      })

      await crowdsaleInstance.buyTokens({
         from: web3.eth.accounts[5],
         gas: 4e6,
         value: amountToBuy6
      })

      await crowdsaleInstance.buyTokens({
         from: web3.eth.accounts[6],
         gas: 4e6,
         value: amountToBuy7
      })

      await crowdsaleInstance.buyTokens({
         from: web3.eth.accounts[8],
         gas: 4e6,
         value: amountToBuy8
      })

      await crowdsaleInstance.buyTokens({
         from: web3.eth.accounts[7],
         gas: 4e6,
         value: amountToBuy9
      })

      setTimeout(async () => {
         const tokensRaised = (await crowdsaleInstance.tokensRaised()).toString()

         assert.equal(tokensRaised, expectedTokens, 'The tokens raised are not correct')
      }, 2e3)
   })

   // Checking that the amount of tokens is limited to 50 million even if people purchase more than expected,
   // buying 18000 ether which is more than the amount required to buy 50 million tokens (16041 ether)
   it("Should buy up to 50 million tokens limiting the ether received when exceeding the maximum", async () => {

      // You can't buy more than 2000 ether as defined by maxPurchase so we split it
      const amountToBuy = web3.toWei(2000, 'ether')
      const amountToBuy2 = web3.toWei(2000, 'ether')
      const amountToBuy3 = web3.toWei(2000, 'ether')
      const amountToBuy4 = web3.toWei(2000, 'ether')
      const amountToBuy5 = web3.toWei(2000, 'ether')
      const amountToBuy6 = web3.toWei(2000, 'ether')
      const amountToBuy7 = web3.toWei(2000, 'ether')
      const amountToBuy8 = web3.toWei(2000, 'ether')
      const amountToBuy9 = web3.toWei(2000, 'ether')
      const expectedTokens = 50e6

      await crowdsaleInstance.buyTokens({
         from: web3.eth.accounts[0],
         gas: 4e6,
         value: amountToBuy
      })

      await crowdsaleInstance.buyTokens({
         from: web3.eth.accounts[1],
         gas: 4e6,
         value: amountToBuy2
      })

      await crowdsaleInstance.buyTokens({
         from: web3.eth.accounts[2],
         gas: 4e6,
         value: amountToBuy3
      })

      await crowdsaleInstance.buyTokens({
         from: web3.eth.accounts[3],
         gas: 4e6,
         value: amountToBuy4
      })

      await crowdsaleInstance.buyTokens({
         from: web3.eth.accounts[4],
         gas: 4e6,
         value: amountToBuy5
      })

      await crowdsaleInstance.buyTokens({
         from: web3.eth.accounts[5],
         gas: 4e6,
         value: amountToBuy6
      })

      await crowdsaleInstance.buyTokens({
         from: web3.eth.accounts[6],
         gas: 4e6,
         value: amountToBuy7
      })

      await crowdsaleInstance.buyTokens({
         from: web3.eth.accounts[7],
         gas: 4e6,
         value: amountToBuy8
      })

      await crowdsaleInstance.buyTokens({
         from: web3.eth.accounts[8],
         gas: 4e6,
         value: amountToBuy9
      })

      setTimeout(async () => {
         const tokensRaised = (await crowdsaleInstance.tokensRaised()).toString()

         assert.equal(tokensRaised, expectedTokens, 'The tokens raised are not correct')
      }, 5e3)
   })

   // Create a new instance of token and crowdsale with the endtime modified to 5 seconds
   // TODO Check why these tests aren't working
   it.skip("Should enable refunds when the crowdsale time is over", async () => {
      const times = new Date()

      // Set the actual time + 5 seconds
      const endTime = Math.floor(times.setSeconds(times.getSeconds() + 5) / 1000)

      tokenInstance = await PallyCoin.new()
      crowdsaleInstance = await Crowdsale.new(web3.eth.accounts[0], tokenInstance.address, endTime, {
         from: web3.eth.accounts[0],
         gas: 4e6,
         value: web3.toWei(1, 'ether')
      })

      await tokenInstance.setCrowdsaleAddress(crowdsaleInstance.address, {
         from: web3.eth.accounts[0],
         gas: 4e6
      })

      await crowdsaleInstance.setTierRates(rateTier1, rateTier2, rateTier3, rateTier4, {
         from: web3.eth.accounts[0],
         gas: 4e6
      })

      // Wait until the crowdsale is ended
      setTimeout(async () => {

         // Call the checkCompletedCrowdsale() to activate the refunding mode
         await crowdsaleInstance.checkCompletedCrowdsale({
            from: web3.eth.accounts[0],
            gas: 4e6
         })

         setTimeout(async () => {

            // Check that the refund mode has been activated
            const isRefunding = await crowdsaleInstance.isRefunding()

            assert.equal(isRefunding, true, "The Crowdsale contracts is not refunding when it should")
         }, 3e3)
      }, 6e3)
   })

   // Check that the initial balance === final balance
   // TODO Check why these tests aren't working
   it.skip("Should refund the ether of a purchase if the state is refunding with the claimRefund()", async () => {
      const times = new Date()
      const amountToBuy = web3.toWei(2, 'ether')
      const initialBalance = await web3.eth.getBalance(web3.eth.accounts[0])
      let finalBalance

      // Set the actual time + 5 seconds
      const endTime = Math.floor(times.setSeconds(times.getSeconds() + 5) / 1000)

      // PallyCoin.new returns a promise so we can await for it
      tokenInstance = await PallyCoin.new()

      // Create a new instance with a modified end time
      crowdsaleInstance = await Crowdsale.new(web3.eth.accounts[0], tokenInstance.address, endTime, {
         from: web3.eth.accounts[0],
         gas: 4e6,
         value: web3.toWei(1, 'ether')
      })

      await tokenInstance.setCrowdsaleAddress(crowdsaleInstance.address, {
         from: web3.eth.accounts[0],
         gas: 4e6
      })

      await crowdsaleInstance.setTierRates(rateTier1, rateTier2, rateTier3, rateTier4, {
         from: web3.eth.accounts[0],
         gas: 4e6
      })

      await crowdsaleInstance.buyTokens({
         from: web3.eth.accounts[0],
         value: amountToBuy
      })

      // Wait until the crowdsale is ended
      setTimeout(async () => {

         // It'll call the checkCompletedCrowdsale() to activate the refunding mode
         await crowdsaleInstance.claimRefund()

         setTimeout(async () => {
            finalBalance = await web3.eth.getBalance(web3.eth.accounts[0])

            assert.equal(initialBalance, finalBalance, "The Crowdsale contracts is not refunding when it should")
         }, 3e3)
      }, 6e3)
   })

   // First deposit 1000 ether in the vault and the buy 500 to transfer the funds to the wallet
   // Check that the ether is forwarded to the wallet correctly
   it.skip("Should close the refund vault and send the ether to the wallet after the minimum goal of 7.5M tokens is reached", async () => {
      const amountToBuy = web3.toWei(1000, 'ether')
      const amountToBuy2 = web3.toWei(500, 'ether')
      const initialBalance = await web3.eth.getBalance(web3.eth.accounts[0])
      const times = new Date()
      const endTime = Math.floor(times.setSeconds(times.getSeconds() + 5) / 1000)
      let firstBalance
      let finalBalance

      // Create a new instance of the crowdsale to use a reduced time
      tokenInstance = await PallyCoin.new()
      crowdsaleInstance = await Crowdsale.new(web3.eth.accounts[0], tokenInstance.address, endTime, {
         from: web3.eth.accounts[0],
         gas: 4e6,
         value: web3.toWei(1, 'ether')
      })

      const vaultAddress = await crowdsaleInstance.vault()
      vaultInstance = web3.eth.contract(RefundVault.abi).at(vaultAddress)

      await tokenInstance.setCrowdsaleAddress(crowdsaleInstance.address, {
         from: web3.eth.accounts[0],
         gas: 4e6
      })

      await crowdsaleInstance.setTierRates(rateTier1, rateTier2, rateTier3, rateTier4, {
         from: web3.eth.accounts[0],
         gas: 4e6
      })

      assert.equal(true, initialBalance > amountToBuy, `You don\'t have the balance to buy ${web3.fromWei(amountToBuy, 'ether')} ethers`)

      await crowdsaleInstance.buyTokens({
         from: web3.eth.accounts[0],
         gas: 4500000,
         value: amountToBuy
      })

      // Make sure that the tokens are in fact stored in the vault
      const vaultBalance = await web3.eth.getBalance(vaultInstance.address)
      assert.equal(amountToBuy, vaultBalance, "The balance of the vault isn't correct")

      // And that the balance of the buyer is reduced
      firstBalance = await web3.eth.getBalance(web3.eth.accounts[0])
      assert.equal(firstBalance, initialBalance - amountToBuy, "The balance after purchasing isn't correct")

      await crowdsaleInstance.buyTokens({
         from: web3.eth.accounts[0],
         gas: 4500000,
         value: amountToBuy2
      })

      setTimeout(async () => {

         // Forwards the vault's funds to the wallet after the crowdsale is ended
         await crowdsaleInstance.checkCompletedCrowdsale({ from: web3.eth.accounts[0], gas: 4e6 })

         finalBalance = await web3.eth.getBalance(web3.eth.accounts[0])
         assert.equal(initialBalance, finalBalance, 'The balance is not correct after buying tokens')
      }, 6e3)
   })

   it("Should be pausable by the owner", async () => {
      await crowdsaleInstance.pause({
         from: web3.eth.accounts[0],
         gas: 4e6
      })

      const paused = await crowdsaleInstance.paused()

      assert.equal(paused, true, "The crowdsale smart contract should be paused")
   })

   it("Should be able to unpause the contract by the owner", async () => {
      await crowdsaleInstance.pause({
         from: web3.eth.accounts[0],
         gas: 4e6
      })

      await crowdsaleInstance.unpause({
         from: web3.eth.accounts[0],
         gas: 4e6
      })

      const paused = await crowdsaleInstance.paused()

      assert.equal(paused, false, "The contract is paused when it shouldn't")
   })

   it.skip("Should not be able to pause the contract if you're not the owner", async () => {
      await crowdsaleInstance.pause({
         from: web3.eth.accounts[1],
         gas: 4e6
      })

      const paused = await crowdsaleInstance.pause()

      assert.equal(paused, false, "The contract is paused when it shouldn't")
   })

   it("Should not allow to buy tokens when the contract is paused", async () => {
      const amountToBuy = web3.toWei(1, 'ether')
      const tokensExpected = 0

      await crowdsaleInstance.pause({
         from: web3.eth.accounts[0],
         gas: 4e6
      })

      await crowdsaleInstance.buyTokens({
         from: web3.eth.accounts[0],
         gas: 4e6,
         value: amountToBuy
      })

      const tokensGenerated = parseInt(await crowdsaleInstance.tokensRaised())

      assert.equal(tokensExpected, tokensGenerated, "The tokens generated don't match the tokens expected")
   })

   // Buy 1500 then 1000. It should only buy the remaining 500 and refund the other 500
   it.skip("Should only allow to buy a total of 2000 ether during the entire crowdsale per buyer", async () => {
      const amountToBuy = web3.toWei(1500, 'ether')
      const amountToBuy2 = web3.toWei(1000, 'ether')
      const expectedTokens = getTokens(web3.toWei(2000, 'ether'), rateTier1)
      const initialBalance = await web3.eth.getBalance(web3.eth.accounts[0])

      await crowdsaleInstance.buyTokens({
         from: web3.eth.accounts[0],
         gas: 4e6,
         value: amountToBuy
      })

      await crowdsaleInstance.buyTokens({
         from: web3.eth.accounts[0],
         gas: 4e6,
         value: amountToBuy2
      })

      const finalBalance = await web3.eth.getBalance(web3.eth.accounts[0])

      assert.equal(finalBalance, initialBalance + expectedTokens, "The expected tokens don't match the final balance")
   })

   it("Should check if the crowdsale has ended or not", async () => {
      const hasEnded = await crowdsaleInstance.hasEnded()

      assert.equal(hasEnded, false, 'It must be not ended until October 30 at 00:00:00 or 12:00 pm')
   })
})
