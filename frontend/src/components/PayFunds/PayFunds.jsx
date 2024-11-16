import React, { useState } from 'react';
import { ethers } from 'ethers';
import ABI from '../../ABI/Payments.json';

const paymentAddress = '0xDe3b9EC9c84910B3aa4C8984A5c78066B7Cf3760';

export default function PayFunds() {
  const [formData, setFormData] = useState({
    id: 0,
  });

  const handleInputChange = event => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  async function fetchPythData() {
    const url =
      'https://hermes.pyth.network/v2/updates/price/latest?ids%5B%5D=0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace';

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Raw Pyth API response:', data);

      if (data && data.binary && Array.isArray(data.binary.data)) {
        return data.binary.data.map(item => '0x' + item);
      } else {
        console.error('Unexpected data structure:', data);
        throw new Error('Invalid or missing data from Pyth API');
      }
    } catch (error) {
      console.error('Error fetching Pyth data:', error);
      throw error;
    }
  }

  async function payRequestHandel(event) {
    event.preventDefault();

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const pythData = await fetchPythData();

    const paymentContract = new ethers.Contract(paymentAddress, ABI, signer);

    const request = await paymentContract.requests(formData.id);
    const requestPrice = Number(request.amount);
    console.log(requestPrice);

    let ethPrice;
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
    );
    const data = await response.json();
    ethPrice = data.ethereum.usd;
    console.log('Current ETH price:', ethPrice);

    const total = requestPrice / ethPrice;
    const roundedAmount = total.toFixed(18);
    const valueToSend = ethers.parseEther(roundedAmount.toString());

    const oneGwei = ethers.parseUnits('1000', 'gwei');

    const valueWithExtraGwei = valueToSend + oneGwei;

    const buyTx = await paymentContract.payRequest(formData.id, pythData, {
      value: valueWithExtraGwei,
    });

    await buyTx.wait();
  }

  return (
    <div>
      <h2>Pay Request</h2>
      <form onSubmit={payRequestHandel}>
        <input
          type="number"
          name="id"
          value={formData.id}
          placeholder="ID to pay"
          onChange={handleInputChange}
        />
        <button type="submit">Pay Request</button>
      </form>
    </div>
  );
}
