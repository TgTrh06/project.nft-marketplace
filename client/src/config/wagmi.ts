import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http } from 'wagmi'
import { mainnet, sepolia, hardhat } from 'viem/chains'

export const config = getDefaultConfig({
  appName: 'Blockchain Game',
  projectId: '035558330d674e7aebbd36e20e0c8056', // Get from https://cloud.walletconnect.com
  chains: [mainnet, sepolia, hardhat],
  transports: {
    [mainnet.id]: http('http://127.0.0.1:8545'),
    [sepolia.id]: http('http://127.0.0.1:8545'),
    [hardhat.id]: http('http://127.0.0.1:8545'),
  },
})