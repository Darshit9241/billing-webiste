// Client API service
const API_URL = 'https://6821b4d8259dad2655b0483d.mockapi.io/siyaram';

export const fetchAllClients = async () => {
  try {
    const response = await fetch(API_URL);
    
    if (!response.ok) {
      throw new Error('Failed to fetch orders');
    }
    
    const data = await response.json();
    // Sort data by timestamp in descending order (newest first)
    return data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  } catch (error) {
    throw new Error(`Error loading client orders: ${error.message}`);
  }
};

export const deleteClient = async (id) => {
  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete order');
    }
    
    return true;
  } catch (error) {
    throw new Error(`Failed to delete order: ${error.message}`);
  }
};

export const clearClientPayment = async (client) => {
  try {
    // Update the payment status to cleared
    const updatedClient = {
      ...client,
      paymentStatus: 'cleared',
      amountPaid: client.grandTotal // Set amount paid to the grand total
    };
    
    const response = await fetch(`${API_URL}/${client.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedClient),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update order payment status');
    }
    
    return updatedClient;
  } catch (error) {
    throw new Error(`Failed to clear order payment: ${error.message}`);
  }
};

export const updateClient = async (client) => {
  try {
    const response = await fetch(`${API_URL}/${client.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(client),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update client details');
    }
    
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to update client details: ${error.message}`);
  }
};

export const createClient = async (client) => {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(client),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create client');
    }
    
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to create client: ${error.message}`);
  }
}; 