import { 
  ref, 
  set, 
  push, 
  get, 
  remove, 
  update,
  query,
  orderByChild
} from 'firebase/database';
import { database } from './config';

const CLIENTS_COLLECTION = 'clients';

// Fetch all clients
export const fetchAllClients = async () => {
  try {
    console.log("Fetching clients from:", CLIENTS_COLLECTION);
    
    // Use a simpler query first
    const clientsRef = ref(database, CLIENTS_COLLECTION);
    
    const snapshot = await get(clientsRef);
    console.log("Snapshot exists:", snapshot.exists());
    
    if (!snapshot.exists()) {
      console.log("No data found in clients collection");
      return [];
    }
    
    const data = [];
    // Convert firebase object to array
    snapshot.forEach((childSnapshot) => {
      const childData = childSnapshot.val();
      console.log("Client data:", childSnapshot.key, childData);
      
      data.push({
        id: childSnapshot.key,
        ...childData,
        // Ensure timestamp is a number
        timestamp: childData.timestamp ? childData.timestamp : Date.now()
      });
    });
    
    // Sort by timestamp descending (newest first)
    const sortedData = data.sort((a, b) => {
      // Handle potential missing or invalid timestamps
      const timestampA = a.timestamp || 0;
      const timestampB = b.timestamp || 0;
      return timestampB - timestampA;
    });
    
    console.log("Sorted data:", sortedData.length, "clients");
    return sortedData;
  } catch (error) {
    console.error("Firebase fetch error:", error);
    throw new Error(`Error loading client orders: ${error.message}`);
  }
};

// Delete client
export const deleteClient = async (id) => {
  try {
    await remove(ref(database, `${CLIENTS_COLLECTION}/${id}`));
    return true;
  } catch (error) {
    throw new Error(`Failed to delete order: ${error.message}`);
  }
};

// Clear client payment
export const clearClientPayment = async (client) => {
  try {
    // Create payment entry
    const paymentEntry = {
      amount: client.grandTotal - (client.amountPaid || 0),
      date: Date.now()
    };
    
    // Update the payment status to cleared with payment history
    const updatedClient = {
      ...client,
      paymentStatus: 'cleared',
      amountPaid: client.grandTotal, // Set amount paid to the grand total
      paymentHistory: [
        ...(client.paymentHistory || []),
        paymentEntry
      ]
    };
    
    await update(ref(database, `${CLIENTS_COLLECTION}/${client.id}`), updatedClient);
    
    return updatedClient;
  } catch (error) {
    throw new Error(`Failed to clear order payment: ${error.message}`);
  }
};

// Update client
export const updateClient = async (client) => {
  try {
    const clientRef = ref(database, `${CLIENTS_COLLECTION}/${client.id}`);
    await update(clientRef, client);
    
    // Get the updated document to return
    const snapshot = await get(clientRef);
    return {
      id: snapshot.key,
      ...snapshot.val()
    };
  } catch (error) {
    throw new Error(`Failed to update client details: ${error.message}`);
  }
};

// Create client
export const createClient = async (client) => {
  try {
    // Ensure timestamp exists
    const clientWithTimestamp = {
      ...client,
      timestamp: client.timestamp || Date.now()
    };
    
    const clientsRef = ref(database, CLIENTS_COLLECTION);
    const newClientRef = push(clientsRef);
    
    await set(newClientRef, clientWithTimestamp);
    console.log("Client created with ID:", newClientRef.key);
    
    // Get the newly created document to return
    const snapshot = await get(newClientRef);
    return {
      id: snapshot.key,
      ...snapshot.val()
    };
  } catch (error) {
    console.error("Create client error:", error);
    throw new Error(`Failed to create client: ${error.message}`);
  }
}; 