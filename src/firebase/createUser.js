import { auth } from './config';
import { createUserWithEmailAndPassword, updateProfile, signInWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { getDatabase, ref, set } from 'firebase/database';

// This script creates a user in Firebase Authentication and Database
// It should be run once to create the user, then removed for security
// To run: node createUser.js

async function createUser() {
  try {
    // Create user in Firebase Authentication
    const email = 'siyaram@gmail.com';
    const password = 'siyaram@';
    
    
    try {
      // Try to sign in with the credentials first to check if user exists
      await signInWithEmailAndPassword(auth, email, password);
    } catch (signInError) {
      // If error is user not found, create the user
      if (signInError.code === 'auth/user-not-found' || 
          signInError.code === 'auth/invalid-credential') {
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Update profile if needed
        await updateProfile(user, {
          displayName: 'Siyaram Admin'
        });
        
        // Add user data to Realtime Database
        const db = getDatabase();
        await set(ref(db, 'users/' + user.uid), {
          email: email,
          role: 'admin',
          lastLogin: new Date().toISOString()
        });
        
      } else {
        // Some other sign-in error occurred
        throw signInError;
      }
    }
    
  } catch (error) {
    console.error('Error:', error.code, error.message);
  }
}

createUser();

// IMPORTANT: After running this script once and creating the user,
// delete this file or remove it from your codebase for security reasons. 