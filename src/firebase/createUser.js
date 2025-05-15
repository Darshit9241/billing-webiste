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
    
    console.log('Checking if user already exists...');
    
    try {
      // Try to sign in with the credentials first to check if user exists
      await signInWithEmailAndPassword(auth, email, password);
      console.log('User already exists. No need to create a new one.');
    } catch (signInError) {
      // If error is user not found, create the user
      if (signInError.code === 'auth/user-not-found' || 
          signInError.code === 'auth/invalid-credential') {
        console.log('User does not exist. Creating new user...');
        
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
        
        console.log('User created successfully with UID:', user.uid);
      } else {
        // Some other sign-in error occurred
        throw signInError;
      }
    }
    
    console.log('Done. You can now use the login credentials:');
    console.log('Email: siyaram@gmail.com');
    console.log('Password: siyaram@');
    
  } catch (error) {
    console.error('Error:', error.code, error.message);
  }
}

createUser();

// IMPORTANT: After running this script once and creating the user,
// delete this file or remove it from your codebase for security reasons. 