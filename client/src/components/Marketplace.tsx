import { useState, useEffect, useMemo } from 'react'
import { useAccount } from 'wagmi'
import { formatEther } from 'viem'
import { useActiveListings, useBuyItem } from '../hooks/useContracts'
import { fetchMetadataByTokenId, savePurchase } from '../services/metadataStorage'
import NotificationModal from './NotificationModal'

interface GameItem {
  listingId: number
  name: string
  description: string
  price: string
  seller: string
  image: string
  category: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  tokenId: bigint
  isLoading?: boolean
}

const rarityColors = {
  common: 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300',
  rare: 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-900 border border-blue-300',
  epic: 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-900 border border-purple-300',
  legendary: 'bg-gradient-to-r from-yellow-100 via-yellow-200 to-yellow-300 text-yellow-900 border border-yellow-400 shadow-md',
}

export default function Marketplace() {
  const { address } = useAccount()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedRarity, setSelectedRarity] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'timestamp-desc' | 'price-asc' | 'price-desc' | 'name' | 'name-desc'>('timestamp-desc')
  const [items, setItems] = useState<GameItem[]>([])

  const { listings, isLoading, refetch: refetchListings } = useActiveListings()
  const { buy, isPending: isBuying, isSuccess: isBuySuccess, error: buyError, hash: buyHash } = useBuyItem()
  const [buyingListingId, setBuyingListingId] = useState<number | null>(null)

  // Notification modal state
  const [notification, setNotification] = useState<{
    isOpen: boolean
    title: string
    message: string
    type: 'success' | 'error' | 'info' | 'warning'
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  })

  // Convert listings to items with metadata from IPFS
  useEffect(() => {
    if (listings) {
      const fetchItemsMetadata = async () => {
        const itemsWithMetadata: GameItem[] = await Promise.all(
          listings.map(async (listing) => {
            try {
              // Try to fetch metadata from IPFS
              const metadata = await fetchMetadataByTokenId(listing.tokenId)

              if (metadata) {
                return {
                  listingId: listing.listingId,
                  name: metadata.name,
                  description: metadata.description,
                  price: formatEther(listing.price),
                  seller: listing.seller,
                  image: metadata.image,
                  category: metadata.category,
                  rarity: metadata.rarity,
                  tokenId: listing.tokenId,
                  isLoading: false,
                }
              } else {
                // Fallback if metadata not found
                return {
                  listingId: listing.listingId,
                  name: `Item #${listing.tokenId}`,
                  description: 'A game item',
                  price: formatEther(listing.price),
                  seller: listing.seller,
                  image: '📦',
                  category: 'Other',
                  rarity: 'common' as const,
                  tokenId: listing.tokenId,
                  isLoading: false,
                }
              }
            } catch (error) {
              console.error(`Error fetching metadata for token ${listing.tokenId}:`, error)
              return {
                listingId: listing.listingId,
                name: `Item #${listing.tokenId}`,
                description: 'A game item',
                price: formatEther(listing.price),
                seller: listing.seller,
                image: '📦',
                category: 'Other',
                rarity: 'common' as const,
                tokenId: listing.tokenId,
                isLoading: false,
              }
            }
          })
        )
        setItems(itemsWithMetadata)
      }

      fetchItemsMetadata()
    }
  }, [listings])

  const categories = useMemo(() => {
    const cats = new Set(items.map(item => item.category))
    return ['all', ...Array.from(cats)]
  }, [items])

  const rarities = ['all', 'common', 'rare', 'epic', 'legendary']

  const filteredItems = useMemo(() => {
    return items
      .filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.description.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
        const matchesRarity = selectedRarity === 'all' || item.rarity === selectedRarity
        return matchesSearch && matchesCategory && matchesRarity
      })
      .sort((a, b) => {
        if (sortBy === 'timestamp-desc') {
          // Sort by listingId descending (higher listingId = newer = listed later)
          return b.listingId - a.listingId
        }
        if (sortBy === 'price-asc') return parseFloat(a.price) - parseFloat(b.price)
        if (sortBy === 'price-desc') return parseFloat(b.price) - parseFloat(a.price)
        if (sortBy === 'name') return a.name.localeCompare(b.name)
        if (sortBy === 'name-desc') return b.name.localeCompare(a.name)
        return b.listingId - a.listingId // Default to timestamp-desc
      })
  }, [items, searchTerm, selectedCategory, selectedRarity, sortBy])

  const handleBuy = async (item: GameItem) => {
    if (!address) {
      alert('Please connect your wallet')
      return
    }

    const listing = listings?.find(l => l.listingId === item.listingId)
    if (!listing) {
      alert('Listing not found. Please refresh the page.')
      return
    }

    // Validate listing is active
    if (!listing.active) {
      alert('This item is no longer available for purchase.')
      refetchListings()
      return
    }

    // Check if user is trying to buy their own item
    if (listing.seller.toLowerCase() === address.toLowerCase()) {
      alert('You cannot buy your own item.')
      return
    }

    // Validate price
    if (listing.price <= 0n) {
      alert('Invalid price. Please refresh the page.')
      return
    }

    try {
      setBuyingListingId(item.listingId)
      buy(BigInt(item.listingId), listing.price)
    } catch (error: any) {
      console.error('Buy error:', error)
      setBuyingListingId(null)
      alert(`Failed to purchase: ${error.message || 'Unknown error'}`)
    }
  }

  // Save purchase to DB when buy succeeds
  useEffect(() => {
    const savePurchaseToDB = async () => {
      if (isBuySuccess && buyHash && address && buyingListingId !== null) {
        try {
          const boughtListing = listings?.find(l => l.listingId === buyingListingId)

          if (boughtListing) {
            await savePurchase({
              buyerAddress: address,
              sellerAddress: boughtListing.seller,
              tokenId: boughtListing.tokenId,
              listingId: boughtListing.listingId,
              price: formatEther(boughtListing.price),
              transactionHash: buyHash,
            })

            // Reset buying state
            setBuyingListingId(null)

            // Show success notification
            setNotification({
              isOpen: true,
              title: 'Purchase Successful!',
              message: 'The item has been added to your collection. You can view it in your Profile.',
              type: 'success',
            })

            // Refetch listings to update UI
            refetchListings()
          }
        } catch (error) {
          console.error('Error saving purchase:', error)
          setNotification({
            isOpen: true,
            title: 'Purchase Saved',
            message: 'Transaction successful, but there was an error saving purchase details. The item is still yours.',
            type: 'warning',
          })
        }
      }
    }

    savePurchaseToDB()
  }, [isBuySuccess, buyHash, address, buyingListingId, listings, refetchListings])

  // Show error notification
  useEffect(() => {
    if (buyError) {
      const errorMessage = buyError.message?.includes('not active')
        ? 'This item is no longer available for purchase.'
        : buyError.message?.includes('wrong price')
          ? 'Price mismatch. Please refresh and try again.'
          : buyError.message?.includes('revert')
            ? 'Transaction failed. The item may no longer be available or you may not have sufficient balance.'
            : buyError.message || 'Unknown error occurred.'

      setNotification({
        isOpen: true,
        title: 'Purchase Failed',
        message: errorMessage,
        type: 'error',
      })
    }
  }, [buyError])

  return (
    <div className="min-h-screen bg-white py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h1 className="text-5xl font-extrabold text-black mb-2">
                  Marketplace
                </h1>
                <p className="text-gray-600 text-lg">Discover and collect unique game items</p>
              </div>
              {isLoading && (
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-md">
                  <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm font-medium text-gray-700">Loading items...</span>
                </div>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="lg:col-span-1">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🔍 Search
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 pl-10 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-gray-50 hover:bg-white"
                  />
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📦 Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-gray-50 hover:bg-white font-medium"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rarity Filter */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ⭐ Rarity
                </label>
                <select
                  value={selectedRarity}
                  onChange={(e) => setSelectedRarity(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-gray-50 hover:bg-white font-medium"
                >
                  {rarities.map(rarity => (
                    <option key={rarity} value={rarity}>
                      {rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🔄 Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-gray-50 hover:bg-white font-medium"
                >
                  <option value="timestamp-desc">Default</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="name">Name: A to Z</option>
                  <option value="name-desc">Name: Z to A</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notification Modal */}
          <NotificationModal
            isOpen={notification.isOpen}
            onClose={() => {
              setNotification({ ...notification, isOpen: false })
              if (notification.type === 'error') {
                refetchListings()
              }
            }}
            title={notification.title}
            message={notification.message}
            type={notification.type}
          />

          {/* Items Grid */}
          {isLoading ? (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent mb-4"></div>
              <p className="text-gray-600 text-lg font-medium">Loading marketplace items...</p>
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredItems.map(item => {
                const isMyItem = address && item.seller.toLowerCase() === address.toLowerCase()
                return (
                  <div
                    key={item.listingId}
                    className="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100"
                  >
                    {/* Image Section with Gradient Overlay */}
                    <div className="relative bg-gray-50 p-6">
                      <div className="text-7xl text-center h-32 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
                        {item.image.startsWith('http') ? (
                          <img src={item.image} alt={item.name} className="w-32 h-32 object-contain drop-shadow-lg" />
                        ) : (
                          <span className="drop-shadow-lg">{item.image}</span>
                        )}
                      </div>
                      {/* Rarity Badge */}
                      <div className="absolute top-4 right-4">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-md ${rarityColors[item.rarity]}`}>
                          {item.rarity.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-6 flex flex-col h-full">
                      <div className="mb-3">
                        <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-green-600 transition-colors">
                          {item.name}
                        </h3>
                        <p className="text-gray-600 text-sm line-clamp-2 min-h-[2.5rem]">{item.description}</p>
                      </div>

                      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-500 flex items-center gap-1">
                          <span className="text-green-500">📦</span>
                          {item.category}
                        </span>
                      </div>

                      {/* Price and Seller Section */}
                      <div className="pt-4">
                        <div className="mb-4">
                          <p className="text-xs text-gray-500 mb-1 font-medium">Price</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-extrabold text-green-600">
                              {item.price}
                            </p>
                            <span className="text-sm font-semibold text-gray-600">ETH</span>
                          </div>
                        </div>

                        <div className="mb-4 p-2 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Seller</p>
                          <p className="text-xs font-mono text-gray-700 truncate">
                            {item.seller.slice(0, 6)}...{item.seller.slice(-4)}
                          </p>
                        </div>

                        <button
                          onClick={() => handleBuy(item)}
                          disabled={!address || isMyItem || isBuying}
                          className="w-full bg-green-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl disabled:shadow-none"
                        >
                          {!address
                            ? '🔗 Connect Wallet'
                            : isMyItem
                              ? '✓ Your Item'
                              : isBuying
                                ? '⏳ Processing...'
                                : '🛒 Buy Now'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-20 bg-white/60 backdrop-blur-sm rounded-2xl border-2 border-dashed border-gray-300">
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-gray-600 text-xl font-semibold mb-2">No items found</p>
              <p className="text-gray-500">Try adjusting your filters to see more results.</p>
            </div>
          )}

          {!isLoading && items.length === 0 && (
            <div className="text-center py-20 bg-white/60 backdrop-blur-sm rounded-2xl border-2 border-dashed border-gray-300">
              <div className="text-6xl mb-4">🎮</div>
              <p className="text-gray-600 text-xl font-semibold mb-2">Marketplace is empty</p>
              <p className="text-gray-500 mb-6">Be the first to create and list an item!</p>
              <button
                onClick={() => window.location.href = '/profile'}
                className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Create Your First Item
              </button>
            </div>
          )}
        </div>
      </div>
    </div >
  )
}
