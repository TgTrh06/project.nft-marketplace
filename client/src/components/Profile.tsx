import { useState, useEffect } from 'react'
import { useAccount, useBalance } from 'wagmi'
import { formatEther } from 'viem'
import CreateItem from './CreateItem'
import { useActiveListings, useIsOwner } from '../hooks/useContracts'
import { fetchMetadataByTokenId, getPurchases, getSales } from '../services/metadataStorage'

interface PurchasedItem {
  listingId: number
  name: string
  description: string
  purchasePrice: string
  purchaseDate: string
  image: string
  category: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  tokenId: bigint
}

interface CreatedItem {
  listingId: number
  name: string
  description: string
  price: string
  sales: number
  totalRevenue: string
  image: string
  category: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  tokenId: bigint
  active: boolean
}

interface SoldItem {
  listingId: number
  name: string
  description: string
  salePrice: string
  saleDate: string
  buyerAddress: string
  image: string
  category: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  tokenId: bigint
  transactionHash: string
}

const rarityColors = {
  common: 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300',
  rare: 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-900 border border-blue-300',
  epic: 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-900 border border-purple-300',
  legendary: 'bg-gradient-to-r from-yellow-100 via-yellow-200 to-yellow-300 text-yellow-900 border border-yellow-400 shadow-md',
}

export default function Profile() {
  const { address, isConnected } = useAccount()
  const { data: balance } = useBalance({
    address: address,
  })
  const { isOwner } = useIsOwner(address)
  // Default tab: 'purchased' for non-owners, 'seller' for owners
  const [activeTab, setActiveTab] = useState<'purchased' | 'seller' | 'sold' | 'create'>(() => {
    // This will be set properly after isOwner is determined
    return 'purchased'
  })
  const { listings, isLoading: listingsLoading, refetch: refetchListings } = useActiveListings()

  // Track purchased items (items bought by user)
  const [purchasedItems, setPurchasedItems] = useState<PurchasedItem[]>([])
  const [isLoadingPurchases, setIsLoadingPurchases] = useState(false)
  
  // Track created items (items listed by user)
  const [createdItems, setCreatedItems] = useState<CreatedItem[]>([])
  const [sales, setSales] = useState<any[]>([])
  
  // Track sold items (items sold by user)
  const [soldItems, setSoldItems] = useState<SoldItem[]>([])
  const [isLoadingSoldItems, setIsLoadingSoldItems] = useState(false)

  // Fetch purchased items from DB
  const fetchPurchasedItems = async () => {
    if (!address) return
    
    setIsLoadingPurchases(true)
    try {
      const purchases = await getPurchases(address)
      
      // Fetch metadata for each purchase
      const itemsWithMetadata = await Promise.all(
        purchases.map(async (purchase: any) => {
          try {
            const metadata = await fetchMetadataByTokenId(BigInt(purchase.tokenId))
            
            if (metadata) {
              return {
                listingId: purchase.listingId,
                name: metadata.name,
                description: metadata.description,
                purchasePrice: purchase.price,
                purchaseDate: new Date(purchase.purchasedAt).toLocaleDateString(),
                image: metadata.image,
                category: metadata.category,
                rarity: metadata.rarity,
                tokenId: BigInt(purchase.tokenId),
              }
            } else {
              return {
                listingId: purchase.listingId,
                name: `Item #${purchase.tokenId}`,
                description: 'A game item',
                purchasePrice: purchase.price,
                purchaseDate: new Date(purchase.purchasedAt).toLocaleDateString(),
                image: '📦',
                category: 'Other',
                rarity: 'common' as const,
                tokenId: BigInt(purchase.tokenId),
              }
            }
          } catch (error) {
            console.error(`Error fetching metadata for token ${purchase.tokenId}:`, error)
            return null
          }
        })
      )

      setPurchasedItems(itemsWithMetadata.filter(item => item !== null) as PurchasedItem[])
    } catch (error) {
      console.error('Error fetching purchases:', error)
    } finally {
      setIsLoadingPurchases(false)
    }
  }

  // Fetch sales from DB
  const fetchSales = async () => {
    if (!address || !isOwner) return
    
    try {
      const salesData = await getSales(address)
      setSales(salesData)
    } catch (error) {
      console.error('Error fetching sales:', error)
    }
  }

  // Fetch sold items with metadata
  const fetchSoldItems = async () => {
    if (!address || !isOwner) return
    
    setIsLoadingSoldItems(true)
    try {
      const salesData = await getSales(address)
      
      // Fetch metadata for each sold item
      const itemsWithMetadata = await Promise.all(
        salesData.map(async (sale: any) => {
          try {
            const metadata = await fetchMetadataByTokenId(BigInt(sale.tokenId))
            
            if (metadata) {
              return {
                listingId: sale.listingId,
                name: metadata.name,
                description: metadata.description,
                salePrice: sale.price,
                saleDate: new Date(sale.purchasedAt).toLocaleDateString(),
                buyerAddress: sale.buyerAddress,
                image: metadata.image,
                category: metadata.category,
                rarity: metadata.rarity,
                tokenId: BigInt(sale.tokenId),
                transactionHash: sale.transactionHash,
              }
            } else {
              return {
                listingId: sale.listingId,
                name: `Item #${sale.tokenId}`,
                description: 'A game item',
                salePrice: sale.price,
                saleDate: new Date(sale.purchasedAt).toLocaleDateString(),
                buyerAddress: sale.buyerAddress,
                image: '📦',
                category: 'Other',
                rarity: 'common' as const,
                tokenId: BigInt(sale.tokenId),
                transactionHash: sale.transactionHash,
              }
            }
          } catch (error) {
            console.error(`Error fetching metadata for token ${sale.tokenId}:`, error)
            return null
          }
        })
      )

      setSoldItems(itemsWithMetadata.filter(item => item !== null) as SoldItem[])
    } catch (error) {
      console.error('Error fetching sold items:', error)
    } finally {
      setIsLoadingSoldItems(false)
    }
  }

  // Update created items from listings with metadata
  const fetchCreatedItems = async () => {
    if (!address || !isOwner) return

    const myListings = listings.filter(
      listing => listing.seller.toLowerCase() === address.toLowerCase()
    )

    const itemsWithMetadata = await Promise.all(
      myListings.map(async (listing) => {
        try {
          const metadata = await fetchMetadataByTokenId(listing.tokenId)
          
          // Get sales count for this tokenId
          const tokenSales = sales.filter(s => s.tokenId === listing.tokenId.toString())
          const salesCount = tokenSales.length
          const totalRevenue = tokenSales.reduce((sum, s) => sum + parseFloat(s.price), 0)
          
          if (metadata) {
            return {
              listingId: listing.listingId,
              name: metadata.name,
              description: metadata.description,
              price: formatEther(listing.price),
              sales: salesCount,
              totalRevenue: totalRevenue.toFixed(4),
              image: metadata.image,
              category: metadata.category,
              rarity: metadata.rarity,
              tokenId: listing.tokenId,
              active: listing.active,
            }
          } else {
            return {
              listingId: listing.listingId,
              name: `Item #${listing.tokenId}`,
              description: 'A game item',
              price: formatEther(listing.price),
              sales: salesCount,
              totalRevenue: totalRevenue.toFixed(4),
              image: '📦',
              category: 'Other',
              rarity: 'common' as const,
              tokenId: listing.tokenId,
              active: listing.active,
            }
          }
        } catch (error) {
          console.error(`Error fetching metadata for token ${listing.tokenId}:`, error)
          return null
        }
      })
    )

    setCreatedItems(itemsWithMetadata.filter(item => item !== null) as CreatedItem[])
  }

  // Set default tab based on owner status
  useEffect(() => {
    if (address && isOwner !== undefined) {
      if (isOwner && activeTab === 'purchased') {
        setActiveTab('seller')
      }
    }
  }, [address, isOwner])

  // Fetch data when address or listings change
  useEffect(() => {
    if (address) {
      if (!isOwner) {
        fetchPurchasedItems()
      } else {
        fetchSales()
        // Also fetch sold items if on that tab
        if (activeTab === 'sold') {
          fetchSoldItems()
        }
      }
    }
  }, [address, isOwner, activeTab])

  // Update created items when listings or sales change
  useEffect(() => {
    if (address && isOwner && listings) {
      fetchCreatedItems()
    }
  }, [listings, sales, address, isOwner])

  // Refetch when tab changes
  useEffect(() => {
    if (activeTab === 'purchased' && address) {
      fetchPurchasedItems()
    } else if (activeTab === 'seller' && address && isOwner) {
      refetchListings()
      fetchSales()
    } else if (activeTab === 'sold' && address && isOwner) {
      fetchSoldItems()
    }
  }, [activeTab, address, isOwner, refetchListings])

  if (!isConnected || !address) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center py-8">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-10 text-center max-w-md">
          <div className="text-6xl mb-6">🔐</div>
          <h2 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            Connect Your Wallet
          </h2>
          <p className="text-gray-600 text-lg mb-6">Connect your wallet to view your profile and manage your items.</p>
        </div>
      </div>
    )
  }

  // Calculate revenue from actual sales data
  const totalRevenue = sales.reduce((sum, sale) => sum + parseFloat(sale.price || '0'), 0)
  const totalSales = sales.length
  const activeListings = createdItems.filter(item => item.active).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-5xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              Profile
            </h1>
            <p className="text-gray-600 text-lg">Manage your items and view your statistics</p>
          </div>

          {/* Wallet Information */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span>💼</span> Wallet Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                <p className="text-sm font-semibold text-gray-600 mb-2">Address</p>
                <p className="text-base font-mono text-gray-900 break-all bg-white/60 px-3 py-2 rounded-lg">{address}</p>
              </div>
              <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
                <p className="text-sm font-semibold text-gray-600 mb-2">Balance</p>
                <p className="text-2xl font-extrabold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  {balance ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}` : 'Loading...'}
                </p>
              </div>
              {isOwner && (
                <div className="md:col-span-2">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full shadow-lg">
                    <span className="text-lg">👑</span>
                    <span className="text-sm font-bold">Contract Owner</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 mb-8 overflow-hidden">
            <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
              <nav className="flex -mb-px overflow-x-auto">
                {!isOwner && (
                  <button
                    onClick={() => setActiveTab('purchased')}
                    className={`px-6 py-4 text-sm font-semibold border-b-3 transition-all whitespace-nowrap ${
                      activeTab === 'purchased'
                        ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                        : 'border-transparent text-gray-500 hover:text-indigo-600 hover:bg-gray-50'
                    }`}
                  >
                    🛍️ Purchased Items ({purchasedItems.length})
                  </button>
                )}
                {isOwner && (
                  <>
                    <button
                      onClick={() => setActiveTab('seller')}
                      className={`px-6 py-4 text-sm font-semibold border-b-3 transition-all whitespace-nowrap ${
                        activeTab === 'seller'
                          ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                          : 'border-transparent text-gray-500 hover:text-indigo-600 hover:bg-gray-50'
                      }`}
                    >
                      📊 Dashboard
                    </button>
                    <button
                      onClick={() => setActiveTab('sold')}
                      className={`px-6 py-4 text-sm font-semibold border-b-3 transition-all whitespace-nowrap ${
                        activeTab === 'sold'
                          ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                          : 'border-transparent text-gray-500 hover:text-indigo-600 hover:bg-gray-50'
                      }`}
                    >
                      💰 Sold Items ({soldItems.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('create')}
                      className={`px-6 py-4 text-sm font-semibold border-b-3 transition-all whitespace-nowrap ${
                        activeTab === 'create'
                          ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                          : 'border-transparent text-gray-500 hover:text-indigo-600 hover:bg-gray-50'
                      }`}
                    >
                      ➕ Create Item
                    </button>
                  </>
                )}
              </nav>
            </div>

            {/* Purchased Items Tab */}
            {activeTab === 'purchased' && (
              <div className="p-6">
                {isLoadingPurchases ? (
                  <div className="text-center py-20">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mb-4"></div>
                    <p className="text-gray-600 text-lg font-medium">Loading purchased items...</p>
                  </div>
                ) : purchasedItems.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {purchasedItems.map(item => (
                      <div
                        key={`${item.listingId}-${item.tokenId}`}
                        className="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100"
                      >
                        <div className="relative bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
                          <div className="text-7xl text-center h-32 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
                            {item.image.startsWith('http') ? (
                              <img src={item.image} alt={item.name} className="w-32 h-32 object-contain drop-shadow-lg" />
                            ) : (
                              <span className="drop-shadow-lg">{item.image}</span>
                            )}
                          </div>
                          <div className="absolute top-4 right-4">
                            <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-md ${rarityColors[item.rarity]}`}>
                              {item.rarity.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="p-6">
                          <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                            {item.name}
                          </h3>
                          <p className="text-gray-600 text-sm line-clamp-2 min-h-[2.5rem] mb-4">{item.description}</p>
                          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                            <span className="text-sm font-medium text-gray-500 flex items-center gap-1">
                              <span className="text-indigo-500">📦</span>
                              {item.category}
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div className="p-2 bg-gray-50 rounded-lg">
                              <p className="text-xs text-gray-500 mb-1">Purchased</p>
                              <p className="text-xs font-medium text-gray-700">{item.purchaseDate}</p>
                            </div>
                            <div className="flex items-baseline gap-2 pl-2">
                              <p className="text-2xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                {item.purchasePrice}
                              </p>
                              <span className="text-sm font-semibold text-gray-600">ETH</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-white/60 backdrop-blur-sm rounded-2xl border-2 border-dashed border-gray-300">
                    <div className="text-6xl mb-4">🛒</div>
                    <p className="text-gray-600 text-xl font-semibold mb-2">No purchased items</p>
                    <p className="text-gray-500">Items you buy will appear here.</p>
                  </div>
                )}
              </div>
            )}

            {/* Seller Dashboard Tab - Only for owner */}
            {activeTab === 'seller' && isOwner && (
              <div className="p-6">
                {/* Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl p-6 border border-indigo-200 shadow-lg hover:shadow-xl transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-indigo-700 font-semibold">Active Listings</p>
                      <span className="text-2xl">📋</span>
                    </div>
                    <p className="text-4xl font-extrabold text-indigo-900">{activeListings}</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-6 border border-green-200 shadow-lg hover:shadow-xl transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-green-700 font-semibold">Total Sales</p>
                      <span className="text-2xl">💰</span>
                    </div>
                    <p className="text-4xl font-extrabold text-green-900">{totalSales}</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-pink-100 rounded-2xl p-6 border border-purple-200 shadow-lg hover:shadow-xl transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-purple-700 font-semibold">Total Revenue</p>
                      <span className="text-2xl">💎</span>
                    </div>
                    <p className="text-4xl font-extrabold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      {totalRevenue.toFixed(4)} ETH
                    </p>
                  </div>
                </div>

                {/* Created Items */}
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900">Your Created Items</h3>
                    <button
                      onClick={() => setActiveTab('create')}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold"
                    >
                      ➕ Create New Item
                    </button>
                  </div>
                  {listingsLoading ? (
                    <div className="text-center py-12">
                      <p className="text-gray-500">Loading your items...</p>
                    </div>
                  ) : createdItems.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {createdItems.map(item => (
                        <div
                          key={item.listingId}
                          className="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100"
                        >
                          <div className="relative bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
                            <div className="text-7xl text-center h-32 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
                              {item.image.startsWith('http') ? (
                                <img src={item.image} alt={item.name} className="w-32 h-32 object-contain drop-shadow-lg" />
                              ) : (
                                <span className="drop-shadow-lg">{item.image}</span>
                              )}
                            </div>
                            <div className="absolute top-4 right-4">
                              <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-md ${rarityColors[item.rarity]}`}>
                                {item.rarity.toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="p-6">
                            <h4 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                              {item.name}
                            </h4>
                            <p className="text-gray-600 text-sm line-clamp-2 min-h-[2.5rem] mb-4">{item.description}</p>
                            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                              <span className="text-sm font-medium text-gray-500 flex items-center gap-1">
                                <span className="text-indigo-500">📦</span>
                                {item.category}
                              </span>
                            </div>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Price:</span>
                                <span className="text-lg font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                  {item.price} ETH
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Status:</span>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${item.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                  {item.active ? '✓ Active' : 'Sold'}
                                </span>
                              </div>
                              {item.sales > 0 && (
                                <>
                                  <div className="flex justify-between items-center pt-2 border-t">
                                    <span className="text-sm text-gray-600">Sales:</span>
                                    <span className="text-sm font-bold text-gray-900">{item.sales}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Revenue:</span>
                                    <span className="text-sm font-bold text-green-600">{item.totalRevenue} ETH</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-20 bg-white/60 backdrop-blur-sm rounded-2xl border-2 border-dashed border-gray-300">
                      <div className="text-6xl mb-4">🎨</div>
                      <p className="text-gray-600 text-xl font-semibold mb-2">No items created yet</p>
                      <p className="text-gray-500 mb-6">Start creating your first item!</p>
                      <button
                        onClick={() => setActiveTab('create')}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                      >
                        ➕ Create Your First Item
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sold Items Tab - Only for owner */}
            {activeTab === 'sold' && isOwner && (
              <div className="p-6">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Sold Items</h3>
                  <p className="text-sm text-gray-600">
                    Total Revenue: <span className="font-semibold text-green-600">{totalRevenue.toFixed(4)} ETH</span>
                  </p>
                </div>
                {isLoadingSoldItems ? (
                  <div className="text-center py-20">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mb-4"></div>
                    <p className="text-gray-600 text-lg font-medium">Loading sold items...</p>
                  </div>
                ) : soldItems.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {soldItems.map((item, index) => (
                      <div
                        key={`${item.listingId}-${item.tokenId}-${index}`}
                        className="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100"
                      >
                        <div className="relative bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-6">
                          <div className="text-7xl text-center h-32 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
                            {item.image.startsWith('http') ? (
                              <img src={item.image} alt={item.name} className="w-32 h-32 object-contain drop-shadow-lg" />
                            ) : (
                              <span className="drop-shadow-lg">{item.image}</span>
                            )}
                          </div>
                          <div className="absolute top-4 right-4">
                            <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-md ${rarityColors[item.rarity]}`}>
                              {item.rarity.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="p-6">
                          <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-green-600 transition-colors">
                            {item.name}
                          </h3>
                          <p className="text-gray-600 text-sm line-clamp-2 min-h-[2.5rem] mb-4">{item.description}</p>
                          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                            <span className="text-sm font-medium text-gray-500 flex items-center gap-1">
                              <span className="text-indigo-500">📦</span>
                              {item.category}
                            </span>
                          </div>
                          <div className="space-y-3">
                            <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                              <p className="text-xs text-gray-500 mb-1 font-medium">Sale Price</p>
                              <p className="text-2xl font-extrabold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                {item.salePrice} ETH
                              </p>
                            </div>
                            <div className="p-2 bg-gray-50 rounded-lg">
                              <p className="text-xs text-gray-500 mb-1">Sold Date</p>
                              <p className="text-xs font-medium text-gray-700">{item.saleDate}</p>
                            </div>
                            <div className="p-2 bg-gray-50 rounded-lg">
                              <p className="text-xs text-gray-500 mb-1">Buyer</p>
                              <p className="text-xs font-mono text-gray-700 break-all">{item.buyerAddress}</p>
                            </div>
                            <div className="pt-2">
                              <p className="text-xs text-gray-500 mb-1">Transaction</p>
                              <a
                                href={`https://localhost:8545/tx/${item.transactionHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-indigo-600 hover:text-indigo-800 break-all underline"
                              >
                                {item.transactionHash.slice(0, 10)}...{item.transactionHash.slice(-8)}
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-white/60 backdrop-blur-sm rounded-2xl border-2 border-dashed border-gray-300">
                    <div className="text-6xl mb-4">💸</div>
                    <p className="text-gray-600 text-xl font-semibold mb-2">No sold items yet</p>
                    <p className="text-gray-500">Items you sell will appear here.</p>
                  </div>
                )}
              </div>
            )}

            {/* Create Item Tab - Only for owner */}
            {activeTab === 'create' && isOwner && (
              <div className="p-6">
                <CreateItem
                  onSuccess={() => {
                    setActiveTab('seller')
                    refetchListings()
                  }}
                />
              </div>
            )}

            {!isOwner && activeTab !== 'purchased' && (
              <div className="p-6 text-center">
                <p className="text-gray-500">Only contract owner can access seller dashboard and create items.</p>
              </div>
            )}
            
            {isOwner && activeTab === 'purchased' && (
              <div className="p-6 text-center">
                <p className="text-gray-500">Owner accounts can only access seller dashboard, sold items, and create items.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
