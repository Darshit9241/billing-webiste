// This script helps set up Firebase user for the application
// Run this from the command line using: node setup-firebase.js

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Setting up Firebase user for Siyaram application...');

// Check if the file exists
const createUserPath = path.join(__dirname, 'src', 'firebase', 'createUser.js');
if (!fs.existsSync(createUserPath)) {
  console.error('Error: createUser.js file not found at:', createUserPath);
  process.exit(1);
}

// Create a temporary Node.js file that can import ES modules
const tempFile = path.join(__dirname, 'temp-create-user.js');
fs.writeFileSync(tempFile, `
require('esbuild-register');
require('./src/firebase/createUser.js');
`);

console.log('Running user creation script...');

// Execute the temporary file
exec(`node ${tempFile}`, (error, stdout, stderr) => {
  // Delete the temporary file
  fs.unlinkSync(tempFile);
  
  if (error) {
    console.error('Error executing script:', error);
    return;
  }
  
  console.log(stdout);
  
  if (stderr) {
    console.error('Script errors:', stderr);
  }
  
  console.log('\nSetup completed!');
  console.log('If you saw "User created successfully" message, the setup was successful.');
  console.log('You can now log in with:');
  console.log('- Email: siyaram@gmail.com');
  console.log('- Password: siyaram@');
}); 