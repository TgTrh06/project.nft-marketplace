# Blockchain Game Client

Client application built with Vite, React, Wagmi, and Tailwind CSS.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Configuration

### Wagmi Configuration

Update `src/config/wagmi.ts` with your WalletConnect Project ID:
- Get your Project ID from https://cloud.walletconnect.com
- Replace `YOUR_PROJECT_ID` in the config file

### Network Configuration

The app is configured to connect to:
- Localhost (http://127.0.0.1:8545)
- Hardhat network

Make sure your local blockchain node is running before connecting.

## Features

- 🔗 Wallet connection with RainbowKit
- ⚡ Fast development with Vite
- 🎨 Beautiful UI with Tailwind CSS
- 📱 Responsive design
- 🔒 Type-safe with TypeScript

