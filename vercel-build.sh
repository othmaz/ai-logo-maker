#!/bin/bash

# Build the client (Vercel uses /vercel/path0, locally we use current dir)
if [ -d "/vercel/path0" ]; then
    cd /vercel/path0/client
else
    cd client
fi

npm run build

# Move the build output to the root dist directory
if [ -d "/vercel/path0" ]; then
    cd /vercel/path0
    rm -rf dist
    mv client/dist .
else
    cd ..
    rm -rf dist
    mv client/dist .
fi

echo "Build completed successfully! Output in dist/ directory"