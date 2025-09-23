#!/bin/bash

# Install root dependencies (backend)
echo "Installing root dependencies..."
npm install --production

# Install server dependencies
echo "Installing server dependencies..."
cd server
npm install --production
cd ..

# Install client dependencies
echo "Installing client dependencies..."
cd client
npm install
cd ..

# Build the client
echo "Building client..."
cd client
npm run build
cd ..

echo "Build completed successfully!"