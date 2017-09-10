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
   // TODO Change this because it's a testing time
   uint256 public constant startTime = 1504224000;

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
   uint256 public constant maxTokensRaised = 50000000;

   // The minimum amount of Wei you must pay to participate in the crowdsale
   uint256 public minPurchase = 100 finney; // 0.1 ether

   // The max amount of Wei that you can pay to participate in the crowdsale
   uint256 public maxPurchase = 2000 ether;

   // Minimum amount of tokens to be raised. 7.5 million tokens which is the 15%
   // of the total of 50 million tokens sold in the crowdsale
   uint256 public minimumGoal = 7500000;

   // If the crowdsale wasn't successful, this will be true and users will be able
   // to claim the refund of their ether
   bool public isRefunding = false;

   // To indicate who purchased what amount of tokens and who received what amount of wei
   event TokenPurchase(address indexed purchaser, address indexed beneficiary, uint256 value, uint256 amount);

   // Indicates if the crowdsale has ended
   event Finalized();

   /// @notice Constructor of the crowsale to set up the main variables and create a token
   /// @param _wallet The wallet address that stores the Wei raised
   /// @param _tokenAddress The token used for the ICO
   function Crowdsale(
      address _wallet,
      address _tokenAddress,
      uint256 _endTime
   ) payable {
      require(_wallet != address(0));
      require(_tokenAddress != address(0));

      wallet = _wallet;
      token = PallyCoin(_tokenAddress);
      vault = new RefundVault(_wallet);

      if(_endTime > 0)
         endTime = _endTime;
   }

   /// @notice Fallback function to buy tokens
   function () payable {
      buyTokens(msg.sender);
   }

   /// @notice To buy tokens given an address
   /// @param beneficiary The address that will get the tokens
   function buyTokens(address beneficiary) payable whenNotPaused {
      require(beneficiary != address(0));
      require(validPurchase());

      uint256 tokens = 0;

      if(tokensRaised < 12500000) {

         // Tier 1
         tokens = msg.value.mul(rate).div(1e18);

         // If the amount of tokens that you want to buy gets out of this tier
         if(tokensRaised.add(tokens) > 12500000)
            tokens = calculateExcessTokens(msg.value, 12500000, 1, rate);
      } else if(tokensRaised >= 12500000 && tokensRaised < 25000000) {

         // Tier 2
         tokens = msg.value.mul(rateTier2).div(1e18);

         // If the amount of tokens that you want to buy gets out of this tier
         if(tokensRaised.add(tokens) > 25000000)
            tokens = calculateExcessTokens(msg.value, 25000000, 2, rateTier2);
      } else if(tokensRaised >= 25000000 && tokensRaised < 37500000) {

         // Tier 3
         tokens = msg.value.mul(rateTier3).div(1e18);

         // If the amount of tokens that you want to buy gets out of this tier
         if(tokensRaised.add(tokens) > 37500000)
            tokens = calculateExcessTokens(msg.value, 37500000, 3, rateTier3);
      } else if(tokensRaised >= 37500000 && tokensRaised <= maxTokensRaised) {

         // Tier 4
         tokens = msg.value.mul(rateTier4).div(1e18);

         // If the amount of tokens that you want to buy gets out of this tier
         if(tokensRaised.add(tokens) > maxTokensRaised)
            tokens = calculateExcessTokens(msg.value, maxTokensRaised, 4, rateTier4);
      }

      weiRaised = weiRaised.add(msg.value);
      tokensRaised = tokensRaised.add(tokens);
      token.distributeICOTokens(beneficiary, tokens);
      TokenPurchase(msg.sender, beneficiary, msg.value, tokens);

      forwardFunds();
   }

   /// @notice Sends the funds to the wallet or to the refund vault smart contract
   /// if the minimum goal of tokens hasn't been reached yet
   function forwardFunds() internal {
      if(tokensRaised < minimumGoal) {
         vault.deposit.value(msg.value)(msg.sender);
      } else {
         wallet.transfer(msg.value);
      }

      // If the minimum goal of the ICO has been reach, close the vault to send
      // the ether to the wallet of the crowdsale
      checkCompletedCrowdsale();
   }

   /// @notice Set's the rate of tokens per ether for each tier. Use it after the
   /// smart contract is deployed to set the price according to the ether price
   /// at the start of the ICO
   /// @param tier1 The amount of tokens you get in the tier one
   /// @param tier2 The amount of tokens you get in the tier two
   /// @param tier3 The amount of tokens you get in the tier three
   /// @param tier4 The amount of tokens you get in the tier four
   function setTierRates(uint256 tier1, uint256 tier2, uint256 tier3, uint256 tier4) external onlyOwner {
      require(tier1 > 0 && tier2 > 0 && tier3 > 0 && tier4 > 0);

      rate = tier1;
      rateTier2 = tier2;
      rateTier3 = tier3;
      rateTier4 = tier4;
   }

   /// @notice Check if the crowdsale has ended and enables refunds only in case the
   /// goal hasn't been reached
   function checkCompletedCrowdsale() public {
      if(hasEnded() && !goalReached()){
         vault.enableRefunds();
         isRefunding = true;
         Finalized();
      } else if(hasEnded() && goalReached()) {
         vault.close();
         Finalized();
      }
   }

   /// @notice If crowdsale is unsuccessful, investors can claim refunds here
   function claimRefund() {
     checkCompletedCrowdsale();
     require(hasEnded() && !goalReached() && isRefunding);

     vault.refund(msg.sender);
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
      uint weiThisTier = tokensThisTier.sub(tokensRaised).mul(1e18).div(_rate);
      uint weiNextTier = amount.sub(weiThisTier);
      uint tokensNextTier;

      // If there's excessive wei for the last tier, refund those
      if(tierSelected == 4)
         msg.sender.transfer(weiNextTier);
      else
         tokensNextTier = calculateTokensTier(weiNextTier, tierSelected.add(1));

      totalTokens = tokensThisTier.sub(tokensRaised).add(tokensNextTier);
   }

   /// @notice Buys the tokens given the price of the tier one and the wei paid
   /// @param weiPaid The amount of wei paid that will be used to buy tokens
   /// @param tierSelected The tier that you'll use for thir purchase
   /// @return tokensBought Returns how many tokens you've bought for that wei paid
   function calculateTokensTier(uint256 weiPaid, uint256 tierSelected)
        internal constant returns(uint256 tokensBought)
   {
      require(weiPaid > 0);
      require(tierSelected >= 1 && tierSelected <= 4);

      if(tierSelected == 1)
         tokensBought = weiPaid.mul(rate).div(1e18);
      else if(tierSelected == 2)
         tokensBought = weiPaid.mul(rateTier2).div(1e18);
      else if(tierSelected == 3)
         tokensBought = weiPaid.mul(rateTier3).div(1e18);
      else
         tokensBought = weiPaid.mul(rateTier4).div(1e18);
   }


   /// @notice Checks if a purchase is considered valid
   /// @return bool If the purchase is valid or not
   function validPurchase() internal constant returns(bool) {
      bool withinPeriod = now >= startTime && now <= endTime;
      bool nonZeroPurchase = msg.value > 0;
      bool withinPurchaseRanges = msg.value >= minPurchase && msg.value <= maxPurchase;
      bool withinTokenLimit = tokensRaised < maxTokensRaised;

      return withinPeriod && nonZeroPurchase && withinPurchaseRanges && withinTokenLimit;
   }

   /// @notice To see if the minimum goal of tokens of the ICO has been reached
   /// @return bool True if the tokens raised are bigger than the goal or false otherwise
   function goalReached() public constant returns(bool) {
      return tokensRaised >= minimumGoal;
   }

   /// @notice Public function to check if the crowdsale has ended or not
   function hasEnded() public constant returns(bool) {
      return now > endTime;
   }
}
