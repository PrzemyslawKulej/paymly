import React, { useState } from 'react';
import { ethers } from 'ethers';
import ABI from '../../ABI/Payments.json';

const paymentAddress = '0xDe3b9EC9c84910B3aa4C8984A5c78066B7Cf3760';

export default function RequestFunds() {
  const [formData, setFormData] = useState({
    amount: 0,
    message: '',
  });

  const handleInputChange = event => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  async function createRequestHandel(event) {
    event.preventDefault();

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const paymentontract = new ethers.Contract(paymentAddress, ABI, signer);

    const createRequest = await paymentontract.createRequest(
      formData.amount,
      formData.message,
    );
    await createRequest.wait();
  }

  return (
    <div>
      <h2>Create Request</h2>
      <form onSubmit={createRequestHandel}>
        <input
          type="number"
          name="amount"
          value={formData.amount}
          placeholder="Amount to request"
          onChange={handleInputChange}
        />
        <input
          type="text"
          name="message"
          value={formData.message}
          placeholder="Enter friendly reminder"
          onChange={handleInputChange}
        />
        <button type="submit">Create Request</button>
      </form>
    </div>
  );
}
