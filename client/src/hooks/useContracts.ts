import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useWatchContractEvent } from 'wagmi'
import { parseEther } from 'viem'
import { useState, useEffect } from 'react'
import contractAddresses from '../contract-address.json'
import GameItemABI from '../artifacts/contracts/GameItem.sol/GameItem.json'
import MarketplaceABI from '../artifacts/contracts/Marketplace.sol/Marketplace.json'

export const GAME_ITEM_ADDRESS = contractAddresses.GameItem as `0x${string}`
export const MARKETPLACE_ADDRESS = contractAddresses.Marketplace as `0x${string}`

export interface Listing {
  listingId: number
  seller: string
  tokenAddress: string
  tokenId: bigint
  price: bigint
  active: boolean
}

// Hook để lấy danh sách active listings
export function useActiveListings() {
  const [listings, setListings] = useState<Listing[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const { data: listingsData, refetch } = useReadContract({
    address: MARKETPLACE_ADDRESS,
    abi: MarketplaceABI.abi,
    functionName: 'getActiveListingsWithIds',
  })

  // Watch events để cập nhật real-time
  useWatchContractEvent({
    address: MARKETPLACE_ADDRESS,
    abi: MarketplaceABI.abi,
    eventName: 'Listed',
    onLogs() {
      refetch()
    },
  })

  useWatchContractEvent({
    address: MARKETPLACE_ADDRESS,
    abi: MarketplaceABI.abi,
    eventName: 'Bought',
    onLogs() {
      refetch()
    },
  })

  useWatchContractEvent({
    address: MARKETPLACE_ADDRESS,
    abi: MarketplaceABI.abi,
    eventName: 'Cancelled',
    onLogs() {
      refetch()
    },
  })

  useEffect(() => {
    if (listingsData) {
      // listingsData is a tuple: [listingIds, activeListings]
      const [listingIds, activeListings] = listingsData as [bigint[], any[]]
      
      const formattedListings: Listing[] = activeListings.map((listing, index) => ({
        listingId: Number(listingIds[index]),
        seller: listing.seller,
        tokenAddress: listing.tokenAddress,
        tokenId: listing.tokenId,
        price: listing.price,
        active: listing.active,
      }))
      setListings(formattedListings)
      setIsLoading(false)
    } else if (listingsData === null) {
      setIsLoading(false)
    }
  }, [listingsData])

  return { listings, isLoading, refetch }
}

// Hook để mint NFT (chỉ owner mới có thể)
export function useMintNFT() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { data: receipt, isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  // Get tokenId from nextTokenId before minting
  const { data: nextTokenId } = useReadContract({
    address: GAME_ITEM_ADDRESS,
    abi: GameItemABI.abi,
    functionName: 'nextTokenId',
  })

  const mint = (to: `0x${string}`) => {
    writeContract({
      address: GAME_ITEM_ADDRESS,
      abi: GameItemABI.abi,
      functionName: 'mint',
      args: [to],
    })
  }

  // TokenId sẽ là nextTokenId trước khi mint
  const tokenId = nextTokenId ? BigInt(nextTokenId.toString()) : null

  return { mint, isPending, isConfirming, isSuccess, error, hash, tokenId, receipt }
}

// Hook để approve marketplace
export function useApproveMarketplace() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const approve = (tokenId: bigint) => {
    writeContract({
      address: GAME_ITEM_ADDRESS,
      abi: GameItemABI.abi,
      functionName: 'approve',
      args: [MARKETPLACE_ADDRESS, tokenId],
    })
  }

  const approveForAll = (approved: boolean) => {
    writeContract({
      address: GAME_ITEM_ADDRESS,
      abi: GameItemABI.abi,
      functionName: 'setApprovalForAll',
      args: [MARKETPLACE_ADDRESS, approved],
    })
  }

  return { approve, approveForAll, isPending, isConfirming, isSuccess, error, hash }
}

// Hook để list item trên marketplace
export function useListItem() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const list = (tokenId: bigint, priceInEth: string) => {
    const priceInWei = parseEther(priceInEth)
    writeContract({
      address: MARKETPLACE_ADDRESS,
      abi: MarketplaceABI.abi,
      functionName: 'list',
      args: [GAME_ITEM_ADDRESS, tokenId, priceInWei],
    })
  }

  return { list, isPending, isConfirming, isSuccess, error, hash }
}

// Hook để buy item
export function useBuyItem() {
  const { writeContract, data: hash, isPending, error } = useWriteContract()
  const { data: receipt, isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const buy = (listingId: bigint, priceInWei: bigint) => {
    writeContract({
      address: MARKETPLACE_ADDRESS,
      abi: MarketplaceABI.abi,
      functionName: 'buy',
      args: [listingId],
      value: priceInWei,
    })
  }

  return { buy, isPending, isConfirming, isSuccess, error, hash, receipt }
}

// Hook để check if address is owner of GameItem contract
export function useIsOwner(userAddress: `0x${string}` | undefined) {
  const { data: owner } = useReadContract({
    address: GAME_ITEM_ADDRESS,
    abi: GameItemABI.abi,
    functionName: 'owner',
    query: { enabled: !!userAddress },
  })

  const isOwner = userAddress && owner 
    ? userAddress.toLowerCase() === (owner as string).toLowerCase()
    : false

  return { isOwner, owner }
}

// Hook để lấy NFTs của user
export function useUserNFTs(userAddress: `0x${string}` | undefined) {
  const [tokenIds, setTokenIds] = useState<bigint[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Lấy balance của user
  const { data: balance } = useReadContract({
    address: GAME_ITEM_ADDRESS,
    abi: GameItemABI.abi,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress },
  })

  // Lấy token IDs (cần implement tokenOfOwnerByIndex hoặc sử dụng events)
  // Tạm thời sử dụng một cách đơn giản: giả sử token IDs là sequential
  useEffect(() => {
    if (balance && userAddress) {
      // Đây là một implementation đơn giản
      // Trong thực tế, bạn cần track token IDs qua events hoặc có một view function
      setIsLoading(false)
    } else {
      setIsLoading(false)
    }
  }, [balance, userAddress])

  // Note: setTokenIds would be used when implementing token ID tracking

  return { tokenIds, isLoading, balance }
}

