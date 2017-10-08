pragma solidity 0.4.15;

import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import 'zeppelin-solidity/contracts/lifecycle/Pausable.sol';
import './PallyCoin.sol';
import './RefundVault.sol';

// 1. First you set the address of the wallet in the RefundVault contract that will store the deposit of ether
// 2. If the goal is reached, the state of the vault will change and the ether will be sent to the address
// 3. If the goal is not reached after 28 days, the state of the vault will change to refunding and the users will be able to call claimRefund() to get their ether

/// @title Crowdsale contract to carry out an ICO with the PallyCoin
/// Crowdsales have a start and end timestamps, where investors can make
/// token purchases and the crowdsale will assign them tokens based
/// on a token per ETH rate. Funds collected are forwarded to a wallet
/// as they arrive.
/// @author Merunas Grincalaitis <merunasgrincalaitis@gmail.com>
contract Crowdsale is Pausable {
   using SafeMath for uint256;

   // The token being sold
   PallyCoin public token;

   // The vault that will store the ether until the goal is reached
   RefundVault public vault;

   // The block number of when the crowdsale starts
   // 10/15/2017 @ 11:00am (UTC)
   // 10/15/2017 @ 12:00am (GMT + 1)
   uint256 public startTime = 1508065200;

   // The block number of when the crowdsale ends
   // 11/13/2017 @ 11:00am (UTC)
   // 11/13/2017 @ 12:00pm (GMT + 1)
   uint256 public endTime = 1510570800;

   // The wallet that holds the Wei raised on the crowdsale
   address public wallet;

   // The rate of tokens per ether. Only applied for the first tier, the first
   // 12.5 million tokens sold
   uint256 public rate;

   // The rate of tokens per ether. Only applied for the second tier, at between
   // 12.5 million tokens sold and 25 million tokens sold
   uint256 public rateTier2;

   // The rate of tokens per ether. Only applied for the third tier, at between
   // 25 million tokens sold and 37.5 million tokens sold
   uint256 public rateTier3;

   // The rate of tokens per ether. Only applied for the fourth tier, at between
   // 37.5 million tokens sold and 50 million tokens sold
   uint256 public rateTier4;

   // The amount of wei raised
   uint256 public weiRaised = 0;

   // The amount of tokens raised
   uint256 public tokensRaised = 0;

   // You can only buy up to 50 M tokens during the ICO
   uint256 public constant maxTokensRaised = 50e24;

   // The minimum amount of Wei you must pay to participate in the crowdsale
   uint256 public constant minPurchase = 100 finney; // 0.1 ether

   // The max amount of Wei that you can pay to participate in the crowdsale
   uint256 public constant maxPurchase = 1000 ether;

   // Minimum amount of tokens to be raised. 7.5 million tokens which is the 15%
   // of the total of 50 million tokens sold in the crowdsale
   // 7.5e6 + 1e18
   uint256 public constant minimumGoal = 7.5e24;

   // If the crowdsale wasn't successful, this will be true and users will be able
   // to claim the refund of their ether
   bool public isRefunding = false;

   // If the crowdsale has ended or not
   bool public isEnded = false;

   // How much each user paid for the crowdsale
   mapping(address => uint256) public crowdsaleBalances;

   // How many tokens each user got for the crowdsale
   mapping(address => uint256) public tokensBought;

   // To indicate who purchased what amount of tokens and who received what amount of wei
   event TokenPurchase(address indexed buyer, uint256 value, uint256 amountOfTokens);

   // Indicates if the crowdsale has ended
   event Finalized();

   /// @notice Constructor of the crowsale to set up the main variables and create a token
   /// @param _wallet The wallet address that stores the Wei raised
   /// @param _tokenAddress The token used for the ICO
   function Crowdsale(
      address _wallet,
      address _tokenAddress,
      uint256 _startTime,
      uint256 _endTime
   ) {
      require(_wallet != address(0));
      require(_tokenAddress != address(0));

      // If you send the start and end time on the constructor, the end must be larger
      if(_startTime > 0 && _endTime > 0)
         require(_startTime < _endTime);

      wallet = _wallet;
      token = PallyCoin(_tokenAddress);
      vault = new RefundVault(_wallet);

      if(_startTime > 0)
         startTime = _startTime;

      if(_endTime > 0)
         endTime = _endTime;
   }

   /// @notice Fallback function to buy tokens
   function () payable {
      buyTokens();
   }

   /// @notice To buy tokens given an address
   function buyTokens() public payable whenNotPaused {
      require(validPurchase());

      uint256 tokens = 0;
      uint256 amountPaid = calculateExcessBalance();

      if(tokensRaised < 12.5e24) {

         // Tier 1
         tokens = amountPaid.mul(rate);

         // If the amount of tokens that you want to buy gets out of this tier
         if(tokensRaised.add(tokens) > 12.5e24)
            tokens = calculateExcessTokens(amountPaid, 12.5e24, 1, rate);
      } else if(tokensRaised >= 12.5e24 && tokensRaised < 25e24) {

         // Tier 2
         tokens = amountPaid.mul(rateTier2);

         // If the amount of tokens that you want to buy gets out of this tier
         if(tokensRaised.add(tokens) > 25e24)
            tokens = calculateExcessTokens(amountPaid, 25e24, 2, rateTier2);
      } else if(tokensRaised >= 25e24 && tokensRaised < 37.5e24) {

         // Tier 3
         tokens = amountPaid.mul(rateTier3);

         // If the amount of tokens that you want to buy gets out of this tier
         if(tokensRaised.add(tokens) > 37.5e24)
            tokens = calculateExcessTokens(amountPaid, 37.5e24, 3, rateTier3);
      } else if(tokensRaised >= 37.5e24) {

         // Tier 4
         tokens = amountPaid.mul(rateTier4);
      }

      weiRaised = weiRaised.add(amountPaid);
      tokensRaised = tokensRaised.add(tokens);
      token.distributeICOTokens(msg.sender, tokens);

      // Keep a record of how many tokens everybody gets in case we need to do refunds
      tokensBought[msg.sender] = tokensBought[msg.sender].add(tokens);
      TokenPurchase(msg.sender, amountPaid, tokens);

      forwardFunds(amountPaid);
   }

   /// @notice Sends the funds to the wallet or to the refund vault smart contract
   /// if the minimum goal of tokens hasn't been reached yet
   /// @param amountPaid The amount of ether paid
   function forwardFunds(uint256 amountPaid) internal whenNotPaused {
      if(goalReached()) {
         wallet.transfer(amountPaid);
      } else {
         vault.deposit.value(amountPaid)(msg.sender);
      }

      // If the minimum goal of the ICO has been reach, close the vault to send
      // the ether to the wallet of the crowdsale
      checkCompletedCrowdsale();
   }

   /// @notice Calculates how many ether will be used to generate the tokens in
   /// case the buyer sends more than the maximum balance but has some balance left
   /// and updates the balance of that buyer.
   /// For instance if he's 500 balance and he sends 1000, it will return 500
   /// and refund the other 500 ether
   function calculateExcessBalance() internal whenNotPaused returns(uint256) {
      uint256 amountPaid = msg.value;
      uint256 differenceWei = 0;
      uint256 exceedingBalance = 0;

      // If we're in the last tier, check that the limit hasn't been reached
      // and if so, refund the difference and return what will be used to
      // buy the remaining tokens
      if(tokensRaised >= 37.5e24) {
         uint256 addedTokens = tokensRaised.add(amountPaid.mul(rateTier4));

         // If tokensRaised + what you paid converted to tokens is bigger than the max
         if(addedTokens > maxTokensRaised) {

            // Refund the difference
            uint256 difference = addedTokens.sub(maxTokensRaised);
            differenceWei = difference.div(rateTier4);

            amountPaid = amountPaid.sub(differenceWei);
         }
      }

      uint256 addedBalance = crowdsaleBalances[msg.sender].add(amountPaid);

      if(addedBalance <= maxPurchase) {
         crowdsaleBalances[msg.sender] = crowdsaleBalances[msg.sender].add(amountPaid);
      } else {

         // Substracting 1000 ether in wei
         exceedingBalance = addedBalance.sub(maxPurchase);
         amountPaid = msg.value.sub(exceedingBalance);

         // Add that balance to the balances
         crowdsaleBalances[msg.sender] = crowdsaleBalances[msg.sender].add(amountPaid);
      }

      // Make the transfers at the end of the function for security purposes
      if(differenceWei > 0)
         msg.sender.transfer(differenceWei);

      if(exceedingBalance > 0) {

         // Return the exceeding balance to the buyer
         msg.sender.transfer(exceedingBalance);
      }

      return amountPaid;
   }

   /// @notice Set's the rate of tokens per ether for each tier. Use it after the
   /// smart contract is deployed to set the price according to the ether price
   /// at the start of the ICO
   /// @param tier1 The amount of tokens you get in the tier one
   /// @param tier2 The amount of tokens you get in the tier two
   /// @param tier3 The amount of tokens you get in the tier three
   /// @param tier4 The amount of tokens you get in the tier four
   function setTierRates(uint256 tier1, uint256 tier2, uint256 tier3, uint256 tier4)
      external onlyOwner whenNotPaused
   {
      require(tier1 > 0 && tier2 > 0 && tier3 > 0 && tier4 > 0);

      rate = tier1;
      rateTier2 = tier2;
      rateTier3 = tier3;
      rateTier4 = tier4;
   }

   /// @notice Check if the crowdsale has ended and enables refunds only in case the
   /// goal hasn't been reached
   function checkCompletedCrowdsale() public whenNotPaused {
      if(!isEnded) {
         if(hasEnded() && !goalReached()){
            vault.enableRefunds();

            isRefunding = true;
            isEnded = true;
            Finalized();
         } else if(hasEnded() && goalReached()) {
            vault.close();

            isEnded = true;
            Finalized();
         }
      }
   }

   /// @notice If crowdsale is unsuccessful, investors can claim refunds here
   function claimRefund() public whenNotPaused {
     require(hasEnded() && !goalReached() && isRefunding);

     vault.refund(msg.sender);
     token.refundTokens(msg.sender, tokensBought[msg.sender]);
   }

   /// @notice Buys the tokens for the specified tier and for the next one
   /// @param amount The amount of ether paid to buy the tokens
   /// @param tokensThisTier The limit of tokens of that tier
   /// @param tierSelected The tier selected
   /// @param _rate The rate used for that `tierSelected`
   /// @return uint The total amount of tokens bought combining the tier prices
   function calculateExcessTokens(
      uint256 amount,
      uint256 tokensThisTier,
      uint256 tierSelected,
      uint256 _rate
   ) public constant returns(uint256 totalTokens) {
      require(amount > 0 && tokensThisTier > 0 && _rate > 0);
      require(tierSelected >= 1 && tierSelected <= 4);

      uint weiThisTier = tokensThisTier.sub(tokensRaised).div(_rate);
      uint weiNextTier = amount.sub(weiThisTier);
      uint tokensNextTier = 0;

      // If there's excessive wei for the last tier, refund those
      if(tierSelected != 4)
         tokensNextTier = calculateTokensTier(weiNextTier, tierSelected.add(1));
      else
         msg.sender.transfer(weiNextTier);

      totalTokens = tokensThisTier.sub(tokensRaised).add(tokensNextTier);
   }

   /// @notice Buys the tokens given the price of the tier one and the wei paid
   /// @param weiPaid The amount of wei paid that will be used to buy tokens
   /// @param tierSelected The tier that you'll use for thir purchase
   /// @return calculatedTokens Returns how many tokens you've bought for that wei paid
   function calculateTokensTier(uint256 weiPaid, uint256 tierSelected)
        internal constant returns(uint256 calculatedTokens)
   {
      require(weiPaid > 0);
      require(tierSelected >= 1 && tierSelected <= 4);

      if(tierSelected == 1)
         calculatedTokens = weiPaid.mul(rate);
      else if(tierSelected == 2)
         calculatedTokens = weiPaid.mul(rateTier2);
      else if(tierSelected == 3)
         calculatedTokens = weiPaid.mul(rateTier3);
      else
         calculatedTokens = weiPaid.mul(rateTier4);
   }


   /// @notice Checks if a purchase is considered valid
   /// @return bool If the purchase is valid or not
   function validPurchase() internal constant returns(bool) {
      bool withinPeriod = now >= startTime && now <= endTime;
      bool nonZeroPurchase = msg.value > 0;
      bool withinTokenLimit = tokensRaised < maxTokensRaised;
      bool minimumPurchase = msg.value >= minPurchase;
      bool hasBalanceAvailable = crowdsaleBalances[msg.sender] < maxPurchase;

      return withinPeriod && nonZeroPurchase && withinTokenLimit && minimumPurchase && hasBalanceAvailable;
   }

   /// @notice To see if the minimum goal of tokens of the ICO has been reached
   /// @return bool True if the tokens raised are bigger than the goal or false otherwise
   function goalReached() public constant returns(bool) {
      return tokensRaised >= minimumGoal;
   }

   /// @notice Public function to check if the crowdsale has ended or not
   function hasEnded() public constant returns(bool) {
      return now > endTime || tokensRaised >= maxTokensRaised;
   }
}
