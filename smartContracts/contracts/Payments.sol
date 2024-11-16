// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import '@pythnetwork/pyth-sdk-solidity/IPyth.sol';
import '@pythnetwork/pyth-sdk-solidity/PythStructs.sol';

contract Payments {
  IPyth pyth;

  enum PaymentStatus {
    Sent,
    Paid
  }

  struct PaymentRequest {
    uint256 requestID;
    address payable creditor;
    uint256 amount;
    string message;
    PaymentStatus status;
  }

  uint256 currentID = 1;
  mapping(address => uint256) userRequestCount;
  mapping(address => mapping(uint256 => PaymentRequest)) userRequests;
  mapping(uint256 => PaymentRequest) requests;

  error INVALID_AMOUNT();
  error INVALID_REQUESTID();
  error REQUEST_ALREADY_PAID();
  error INSUFFICIENT_FUNDS();
  error TRANSFER_FAILED();

  event RequestCreated(
    uint256 currentID,
    address creditor,
    uint256 amount,
    string message,
    PaymentStatus status
  );
  event RequestPaid(
    uint256 currentID,
    address payee,
    uint256 amount,
    PaymentStatus status
  );

  constructor() {
    pyth = IPyth(0x0708325268dF9F66270F1401206434524814508b);
  }

  function createRequest(uint256 _amount, string calldata _message) external {
    if (_amount == 0) {
      revert INVALID_AMOUNT();
    }
    uint256 requestNumber = userRequestCount[msg.sender] + 1;

    PaymentRequest memory newRequest = PaymentRequest(
      currentID,
      payable(msg.sender),
      _amount,
      _message,
      PaymentStatus.Sent
    );

    requests[currentID] = newRequest;
    userRequests[msg.sender][requestNumber] = newRequest;
    userRequestCount[msg.sender] = requestNumber;

    emit RequestCreated(
      currentID,
      msg.sender,
      _amount,
      _message,
      newRequest.status
    );
    currentID++;
  }

  function payRequest(
    uint256 _requestID,
    bytes[] calldata _priceUpdate
  ) external payable {
    if (_requestID >= currentID) {
      revert INVALID_REQUESTID();
    }
    PaymentRequest storage current = requests[_requestID];
    if (current.status == PaymentStatus.Paid) {
      revert REQUEST_ALREADY_PAID();
    }
    // pyth network check if funds are correct
    int256 ethPrice = getEthPrice(_priceUpdate);
    require(ethPrice > 0, 'Invalid ETH price');
    uint256 listingPriceInEth = (current.amount * 1e26) / uint256(ethPrice);
    // Check if enough ETH was sent
    require(msg.value >= listingPriceInEth, 'Not enough ETH sent');

    (bool sent, ) = current.creditor.call{ value: current.amount }('');
    if (!sent) {
      revert TRANSFER_FAILED();
    }
    current.status = PaymentStatus.Paid;
    emit RequestPaid(
      current.requestID,
      msg.sender,
      current.amount,
      current.status
    );
  }

  function getEthPrice(
    bytes[] calldata priceUpdate
  ) public payable returns (int256) {
    uint256 fee = pyth.getUpdateFee(priceUpdate);
    pyth.updatePriceFeeds{ value: fee }(priceUpdate);

    bytes32 priceFeedId = 0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;
    PythStructs.Price memory price = pyth.getPriceNoOlderThan(priceFeedId, 60);

    require(price.price > 0, 'Invalid price');
    return price.price;
  }

  function getRequest(
    uint256 _requestCount
  ) external view returns (PaymentRequest memory) {
    return userRequests[msg.sender][_requestCount];
  }
}
