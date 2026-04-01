#!/bin/bash

echo "Installing root dependencies..."
npm install

echo "Installing client dependencies..."
cd client && npm install && cd ..

echo "Starting server and client..."
# Start server in background
node server.js &
SERVER_PID=$!

# Start client
cd client && npm run dev &
CLIENT_PID=$!

# Trap to kill both on exit
trap "kill $SERVER_PID $CLIENT_PID 2>/dev/null" EXIT

# Wait for both
wait
