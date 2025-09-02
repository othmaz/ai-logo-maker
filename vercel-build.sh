#!/bin/bash

# Build the client
cd /vercel/path0/client || cd client
npm run build
cd /vercel/path0 || cd ..

# Move the build output to the root dist directory
rm -rf dist
mv client/dist .

echo "Build completed successfully! Output in dist/ directory"