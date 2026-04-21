#!/bin/bash
# Skribbl Clone Monorepo Scaffolder

# 1. Root Initialization
npm init -y

# 2. Configure Workspaces
cat > package.json <<EOF
{
  "name": "skribbl-clone",
  "private": true,
  "workspaces": [
    "apps/*"
  ],
  "scripts": {
    "client": "npm run dev -w apps/client",
    "server": "npm run dev -w apps/server",
    "dev": "concurrently \"npm run client\" \"npm run server\""
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
EOF

# 3. Directory Structure
mkdir -p apps/client apps/server/src/classes apps/server/src/handlers apps/server/src/utils

# 4. Scaffold Client (React + Vite + TS)
cd apps/client
npm create vite@latest . -- --template react-ts
npm install
npm install socket.io-client zustand react-router-dom lucide-react clsx tailwind-merge
cd ../..

# 5. Scaffold Server (Node + Express + Socket.IO)
cd apps/server
npm init -y
npm install express socket.io cors dotenv nanoid
npm install -D typescript ts-node @types/node @types/express @types/cors nodemon
npx tsc --init

# Configure Server Scripts
sed -i 's/"test": "echo \\"Error: no test specified\\" \&\& exit 1"/"dev": "nodemon --watch src --exec ts-node src\/index.ts"/' package.json

cd ../..
echo "Scaffolding complete. Run 'npm install' then 'npm run dev'."
