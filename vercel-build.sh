#!/bin/bash

# Build the client
cd client
npm run build
cd ..

# Move the build output to the root dist directory
rm -rf dist
mv client/dist .

# Clean up
rm -rf client/dist

echo "Build completed successfully! Output in dist/ directory"