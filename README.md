# Blockchain Game Project

This project is a decentralized application (dApp) that combines a React frontend with a Node.js/Express backend and Solidity smart contracts. It allows users to mint, buy, and sell in-game items as NFTs on a local blockchain network.

## Project Architecture

The system consists of three main components:
1.  **Frontend (Client)**: A React application that interacts with the user, the backend API, and the blockchain via smart contracts.
2.  **Backend (Server)**: A Node.js/Express server that manages off-chain data (item metadata, purchase history) and interacts with a MongoDB database.
3.  **Blockchain**: Local Hardhat network running Solidity smart contracts for NFT ownership and marketplace logic.

## 🚀 Frontend (Client)

The frontend is built with modern web technologies to provide a seamless user experience for interacting with the blockchain.

### Tech Stack
-   **Framework**: [React 18](https://react.dev/)
-   **Build Tool**: [Vite](https://vitejs.dev/)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [TailwindCSS](https://tailwindcss.com/)
-   **Blockchain Interaction**:
    -   [Wagmi](https://wagmi.sh/) (React Hooks for Ethereum)
    -   [Viem](https://viem.sh/) (TypeScript Interface for Ethereum)
    -   [RainbowKit](https://www.rainbowkit.com/) (Wallet Connection UI)
-   **State Management**: [TanStack Query](https://tanstack.com/query/latest) (Async state management)

### Key Features
-   **Wallet Connection**: Seamless integration with MetaMask and other wallets via RainbowKit.
-   **Marketplace UI**: Browse, buy, and sell game items.
-   **Profile Management**: View owned items and transaction history.
-   **Responsive Design**: Optimized for various screen sizes using TailwindCSS.

### Setup & Installation

1.  Navigate to the client directory:
    ```bash
    cd client
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5173`.

---

## 🛠️ Backend (Server)

The backend handles data persistence and serves metadata for the NFTs.

### Tech Stack
-   **Runtime**: [Node.js](https://nodejs.org/)
-   **Framework**: [Express](https://expressjs.com/)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Database**: [MongoDB](https://www.mongodb.com/)
-   **Blockchain Development**:
    -   [Hardhat](https://hardhat.org/) (Ethereum development environment)
    -   [Ethers.js](https://docs.ethers.org/v6/) (Web3 library)

### Smart Contracts
Located in `server/contracts`:
-   `GameItem.sol`: ERC721 token contract for game items.
-   `Marketplace.sol`: Contract for handling listing and purchasing of items.

### Key Features
-   **Metadata API**: Serves JSON metadata for NFTs (compliant with ERC721 standards).
-   **Purchase History**: Tracks and stores off-chain records of marketplace transactions.
-   **Batch Operations**: Supports fetching metadata for multiple items in a single request.

### Setup & Installation

1.  Navigate to the server directory:
    ```bash
    cd server
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  **Environment Setup**:
    Create a `.env` file in the `server` directory (if not already present) and configure your MongoDB URI:
    ```env
    MONGODB_URI=your_mongodb_connection_string
    PORT=3001
    ```
4.  **Start the Local Blockchain**:
    ```bash
    npx hardhat node
    ```
    This will start a local Ethereum network and generate test accounts.
5.  **Deploy Contracts**:
    In a separate terminal (still in `server` directory):
    ```bash
    npx hardhat run scripts/deploy.ts --network localhost
    ```
    *Note the deployed contract addresses for frontend configuration.*
6.  **Start the API Server**:
    ```bash
    npm run api
    ```
    The server will run on `http://localhost:3001`.

## 🔄 Running the Full System

1.  Start MongoDB (if running locally).
2.  Start the Hardhat node: `npx hardhat node` (server dir).
3.  Deploy contracts: `npx hardhat run scripts/deploy.ts --network localhost` (server dir).
4.  Start the Backend API: `npm run api` (server dir).
5.  Start the Frontend: `npm run dev` (client dir).