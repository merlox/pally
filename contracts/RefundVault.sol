pragma solidity 0.4.15;

import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import 'zeppelin-solidity/contracts/ownership/Ownable.sol';

/**
 * @title RefundVault
 * @dev This contract is used for storing funds while a crowdsale
 * is in progress. Supports refunding the money if crowdsale fails,
 * and forwarding it if crowdsale is successful.
 */
contract RefundVault is Ownable {
  using SafeMath for uint256;

  enum State { Active, Refunding, Closed }

  address public wallet;
  address private crowdsale;
  State public state;
  uint256 public weiBalance;

  mapping (address => uint256) public deposited;

  event RefundsEnabled();
  event Refunded(address indexed beneficiary, uint256 weiAmount);
  event LogDeposited(address indexed buyer, uint256 amount);
  event VaultClosed();

  modifier onlyCrowdsale() {
      require(msg.sender == crowdsale);
      _;
  }

  function RefundVault(address _wallet) {
    require(_wallet != 0x0);

    wallet = _wallet;
    crowdsale = msg.sender;
    state = State.Active;
  }

  function deposit(address investor) external payable onlyCrowdsale {
    require(state == State.Active);

    weiBalance = weiBalance.add(msg.value);
    deposited[investor] = deposited[investor].add(msg.value);
    LogDeposited(msg.sender, msg.value);
  }

  function close() external onlyCrowdsale {
    require(state == State.Active);

    state = State.Closed;
    wallet.transfer(weiBalance);
    VaultClosed();
  }

  function enableRefunds() external onlyCrowdsale {
    require(state == State.Active);

    state = State.Refunding;
    RefundsEnabled();
  }

  function refund(address investor) external onlyCrowdsale {
    require(state == State.Refunding);

    uint256 depositedValue = deposited[investor];
    weiBalance = weiBalance.sub(depositedValue);
    deposited[investor] = 0;
    investor.transfer(depositedValue);
    Refunded(investor, depositedValue);
  }
}
