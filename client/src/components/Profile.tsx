import { useState, useEffect, useMemo } from 'react'
import { useAccount, useBalance } from 'wagmi'
import { formatEther } from 'viem'
import CreateItem from './CreateItem'
import { useActiveListings, useIsOwner, useCancelListing } from '../hooks/useContracts'
import { fetchMetadataByTokenId, getPurchases, getSales } from '../services/metadataStorage'
import { ConnectButton } from '@rainbow-me/rainbowkit'

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

  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedRarity, setSelectedRarity] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'timestamp-desc' | 'price-asc' | 'price-desc' | 'name' | 'name-desc'>('timestamp-desc')

  const { cancel, isPending: isCancelling, isSuccess: isCancelSuccess } = useCancelListing()

  // Filter logic
  const filterItems = <T extends { name: string, description: string, category: string, rarity: string, listingId: number, price?: string, purchasePrice?: string, salePrice?: string }>(items: T[]) => {
    return items
      .filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.description.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
        const matchesRarity = selectedRarity === 'all' || item.rarity === selectedRarity
        return matchesSearch && matchesCategory && matchesRarity
      })
      .sort((a, b) => {
        if (sortBy === 'timestamp-desc') return b.listingId - a.listingId
        if (sortBy === 'price-asc') return parseFloat(a.price || a.purchasePrice || a.salePrice || '0') - parseFloat(b.price || b.purchasePrice || b.salePrice || '0')
        if (sortBy === 'price-desc') return parseFloat(b.price || b.purchasePrice || b.salePrice || '0') - parseFloat(a.price || a.purchasePrice || a.salePrice || '0')
        if (sortBy === 'name') return a.name.localeCompare(b.name)
        if (sortBy === 'name-desc') return b.name.localeCompare(a.name)
        return b.listingId - a.listingId
      })
  }

  const filteredPurchasedItems = useMemo(() => filterItems(purchasedItems), [purchasedItems, searchTerm, selectedCategory, selectedRarity, sortBy])
  const filteredCreatedItems = useMemo(() => filterItems(createdItems), [createdItems, searchTerm, selectedCategory, selectedRarity, sortBy])
  const filteredSoldItems = useMemo(() => filterItems(soldItems), [soldItems, searchTerm, selectedCategory, selectedRarity, sortBy])

  const categories = useMemo(() => {
    const allItems = [...purchasedItems, ...createdItems, ...soldItems]
    const cats = new Set(allItems.map(item => item.category))
    return ['all', ...Array.from(cats)]
  }, [purchasedItems, createdItems, soldItems])

  const rarities = ['all', 'common', 'rare', 'epic', 'legendary']

  const handleCancel = async (listingId: number) => {
    if (confirm('Are you sure you want to cancel this listing?')) {
      try {
        cancel(BigInt(listingId))
      } catch (error) {
        console.error('Error cancelling listing:', error)
      }
    }
  }

  useEffect(() => {
    if (isCancelSuccess) {
      refetchListings()
    }
  }, [isCancelSuccess])

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
      <div className="min-h-screen bg-[#E7F5DC] flex items-center justify-center py-8">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-10 text-center max-w-6xl">
          <div className="text-6xl mb-6">🔐</div>
          <h2 className="text-3xl font-extrabold text-black mb-4">
            Connect Your Wallet
          </h2>
          <p className="text-gray-600 text-lg mb-6">Connect your wallet to view your profile and manage your items.</p>
          <div className='flex items-center justify-center mt-6'>
            <ConnectButton />
          </div>
        </div>
      </div>
    )
  }

  // Calculate revenue from actual sales data
  const totalRevenue = sales.reduce((sum, sale) => sum + parseFloat(sale.price || '0'), 0)
  const totalSales = sales.length
  const activeListings = createdItems.filter(item => item.active).length

  return (
    <div className="relative min-h-screen bg-cover bg-center py-12 z-10"
      style={{ backgroundImage: "url('/image1.gif')" }}
    >
      {/* Lớp phủ đen mờ */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-4 text-center bg-white rounded-2xl p-6">
            <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600 mb-4 inline-block">
              Profile
            </h1>
            <p className="text-black text-lg max-w-2xl mx-auto">Manage your items and view your statistics</p>
          </div>

          {/* Wallet Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span>💼</span> Wallet Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-gray-50 rounded-xl border-4 border-gray-200">
                <p className="text-sm font-semibold text-gray-600 mb-2">Address</p>
                <p className="text-base font-mono text-gray-900 break-all bg-white/60 px-3 py-2 rounded-lg">{address}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-xl border-4 border-green-200">
                <p className="text-sm font-semibold text-gray-600 mb-2">Balance</p>
                <p className="text-2xl font-extrabold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  {balance ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}` : 'Loading...'}
                </p>
              </div>
              {isOwner && (
                <div className="md:col-span-2">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-full shadow-lg">
                    <span className="text-lg">👑</span>
                    <span className="text-sm font-bold">Contract Owner</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content Container */}
          <div className="bg-white rounded-3xl p-8 shadow-2xl">
            {/* Tabs */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#E7F5DC] mb-8 overflow-hidden">
              <div className="border-b-2 border-[#E7F5DC] bg-gradient-to-r from-gray-50 to-white">
                <nav className="flex -mb-px overflow-x-auto">
                  {!isOwner && (
                    <button
                      onClick={() => setActiveTab('purchased')}
                      className={`px-6 py-4 text-sm font-semibold border-b-3 transition-all whitespace-nowrap ${activeTab === 'purchased'
                        ? 'border-[#E7F5DC] text-black bg-[#E7F5DC]'
                        : 'border-r-2 border-[#E7F5DC] border-transparent text-gray-500 hover:text-green-600 hover:bg-gray-50'
                        }`}
                    >
                      🛍️ Purchased Items ({purchasedItems.length})
                    </button>
                  )}
                  {isOwner && (
                    <>
                      <button
                        onClick={() => setActiveTab('seller')}
                        className={`px-6 py-4 text-sm font-semibold border-b-3 transition-all whitespace-nowrap ${activeTab === 'seller'
                          ? 'border-green-600 text-white bg-green-600'
                          : 'border-r-2 border-[#E7F5DC] border-transparent text-gray-500 hover:text-green-600 hover:bg-gray-50'
                          }`}
                      >
                        📊 Dashboard
                      </button>
                      <button
                        onClick={() => setActiveTab('sold')}
                        className={`px-6 py-4 text-sm font-semibold border-b-3 transition-all whitespace-nowrap ${activeTab === 'sold'
                          ? 'border-green-600 text-white bg-green-600'
                          : 'border-r-2 border-[#E7F5DC] border-transparent text-gray-500 hover:text-green-600 hover:bg-gray-50'
                          }`}
                      >
                        💰 Sold Items ({soldItems.length})
                      </button>
                      <button
                        onClick={() => setActiveTab('create')}
                        className={`px-6 py-4 text-sm font-semibold border-b-3 transition-all whitespace-nowrap ${activeTab === 'create'
                          ? 'border-green-600 text-white bg-green-600'
                          : 'border-r-2 border-[#E7F5DC] border-transparent text-gray-500 hover:text-green-600 hover:bg-gray-50'
                          }`}
                      >
                        ➕ Create Item
                      </button>
                    </>
                  )}
                </nav>
              </div>


              {/* Filters */}
              {activeTab !== 'create' && (
                <div className="p-6 border-b-2 border-[#E7F5DC] bg-gray-50/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="lg:col-span-1">
                      <input
                        type="text"
                        placeholder="Search items..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                      />
                    </div>

                    {/* Category Filter */}
                    <div>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
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
                      <select
                        value={selectedRarity}
                        onChange={(e) => setSelectedRarity(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
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
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
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
              )}
              {activeTab === 'purchased' && (
                <div className="p-6">
                  {isLoadingPurchases ? (
                    <div className="text-center py-20">
                      <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent mb-4"></div>
                      <p className="text-gray-600 text-lg font-medium">Loading purchased items...</p>
                    </div>
                  ) : filteredPurchasedItems.length > 0 ? (
                    <div className="space-y-4">
                      {filteredPurchasedItems.map(item => (
                        <div
                          key={`${item.listingId}-${item.tokenId}`}
                          className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-200 overflow-hidden flex flex-col sm:flex-row"
                        >
                          {/* Image Section */}
                          <div className="relative w-full sm:w-48 h-48 sm:h-auto bg-gray-50 flex-shrink-0 flex items-center justify-center border-b sm:border-b-0 sm:border-r border-gray-100">
                            <div className="text-5xl transform group-hover:scale-110 transition-transform duration-300">
                              {item.image.startsWith('http') ? (
                                <img src={item.image} alt={item.name} className="w-32 h-32 object-contain drop-shadow-md" />
                              ) : (
                                <span className="drop-shadow-md">{item.image}</span>
                              )}
                            </div>
                            <div className="absolute top-2 right-2">
                              <span className={`px-2 py-1 rounded-full text-[10px] font-bold shadow-sm ${rarityColors[item.rarity as keyof typeof rarityColors]}`}>
                                {item.rarity.toUpperCase()}
                              </span>
                            </div>
                          </div>

                          {/* Content Section */}
                          <div className="p-6 flex-grow flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start mb-2">
                                <h3 className="text-xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">
                                  {item.name}
                                </h3>
                                <span className="text-sm font-medium text-gray-500 flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-lg">
                                  <span className="text-green-500">📦</span>
                                  {item.category}
                                </span>
                              </div>
                              <p className="text-gray-600 text-sm mb-4 line-clamp-2">{item.description}</p>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Purchased Date</p>
                                <p className="text-sm font-medium text-gray-900">{item.purchaseDate}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Price</p>
                                <p className="text-sm font-bold text-green-600">{item.purchasePrice} ETH</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-20 bg-white/10 backdrop-blur-sm rounded-2xl border-2 border-dashed border-gray-700">
                      <div className="text-6xl mb-4">🛒</div>
                      <p className="text-gray-800 text-xl font-semibold mb-2">No purchased items</p>
                      <p className="text-gray-600">Items you buy will appear here.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Seller Dashboard Tab - Only for owner */}
              {activeTab === 'seller' && isOwner && (
                <div className="p-6">
                  {/* Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-2xl p-6 border-2 border-[#E7F5DC] shadow-lg hover:shadow-xl transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm text-gray-700 font-semibold">Active Listings</p>
                        <span className="text-2xl">📋</span>
                      </div>
                      <p className="text-4xl font-extrabold text-black">{activeListings}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-6 border-2 border-[#E7F5DC] shadow-lg hover:shadow-xl transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm text-green-700 font-semibold">Total Sales</p>
                        <span className="text-2xl">💰</span>
                      </div>
                      <p className="text-4xl font-extrabold text-green-900">{totalSales}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-6 border-2 border-[#E7F5DC] shadow-lg hover:shadow-xl transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm text-gray-700 font-semibold">Total Revenue</p>
                        <span className="text-2xl">💎</span>
                      </div>
                      <p className="text-4xl font-extrabold text-green-600">
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
                        className="bg-green-600 text-white px-6 py-3 rounded-xl hover:bg-green-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold"
                      >
                        ➕ Create New Item
                      </button>
                    </div>
                    {listingsLoading ? (
                      <div className="text-center py-12">
                        <p className="text-gray-500">Loading your items...</p>
                      </div>
                    ) : filteredCreatedItems.length > 0 ? (
                      <div className="space-y-4">
                        {filteredCreatedItems.map(item => (
                          <div
                            key={item.listingId}
                            className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-[#E7F5DC] overflow-hidden flex flex-col sm:flex-row"
                          >
                            {/* Image Section */}
                            <div className="relative w-full sm:w-48 h-48 sm:h-auto bg-gray-50 flex-shrink-0 flex items-center justify-center border-b sm:border-b-0 sm:border-r border-[#E7F5DC]">
                              <div className="text-5xl transform group-hover:scale-110 transition-transform duration-300">
                                {item.image.startsWith('http') ? (
                                  <img src={item.image} alt={item.name} className="w-32 h-32 object-contain drop-shadow-md" />
                                ) : (
                                  <span className="drop-shadow-md">{item.image}</span>
                                )}
                              </div>
                              <div className="absolute top-2 right-2">
                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold shadow-sm ${rarityColors[item.rarity as keyof typeof rarityColors]}`}>
                                  {item.rarity.toUpperCase()}
                                </span>
                              </div>
                            </div>

                            {/* Content Section */}
                            <div className="p-6 flex-grow flex flex-col justify-between">
                              <div>
                                <div className="flex justify-between items-start mb-2">
                                  <h4 className="text-xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">
                                    {item.name}
                                  </h4>
                                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${item.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                    {item.active ? '✓ Active' : 'Sold'}
                                  </span>
                                </div>
                                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{item.description}</p>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-100 items-end">
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Price</p>
                                  <p className="text-lg font-bold text-green-600">{item.price} ETH</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Total Sales</p>
                                  <p className="text-sm font-medium text-gray-900">{item.sales}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Revenue</p>
                                  <p className="text-sm font-medium text-green-600">{item.totalRevenue} ETH</p>
                                </div>
                                <div className="flex justify-end">
                                  {item.active && (
                                    <button
                                      onClick={() => handleCancel(item.listingId)}
                                      disabled={isCancelling}
                                      className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-semibold border border-red-200"
                                    >
                                      {isCancelling ? 'Cancelling...' : 'Cancel Listing'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-20 bg-white/10 backdrop-blur-sm rounded-2xl border-2 border-dashed border-gray-700">
                        <div className="text-6xl mb-4">🎨</div>
                        <p className="text-gray-800 text-xl font-semibold mb-2">No created items</p>
                        <p className="text-gray-600 mb-6">Create your first unique item to list on the marketplace.</p>
                        <button
                          onClick={() => setActiveTab('create')}
                          className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                          Create Item
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
                      <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent mb-4"></div>
                      <p className="text-gray-600 text-lg font-medium">Loading sold items...</p>
                    </div>
                  ) : filteredSoldItems.length > 0 ? (
                    <div className="space-y-4">
                      {filteredSoldItems.map((item, index) => (
                        <div
                          key={`${item.listingId}-${item.tokenId}-${index}`}
                          className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-200 overflow-hidden flex flex-col sm:flex-row"
                        >
                          {/* Image Section */}
                          <div className="relative w-full sm:w-48 h-48 sm:h-auto bg-gray-50 flex-shrink-0 flex items-center justify-center border-b sm:border-b-0 sm:border-r border-gray-100">
                            <div className="text-5xl transform group-hover:scale-110 transition-transform duration-300">
                              {item.image.startsWith('http') ? (
                                <img src={item.image} alt={item.name} className="w-32 h-32 object-contain drop-shadow-md" />
                              ) : (
                                <span className="drop-shadow-md">{item.image}</span>
                              )}
                            </div>
                            <div className="absolute top-2 right-2">
                              <span className={`px-2 py-1 rounded-full text-[10px] font-bold shadow-sm ${rarityColors[item.rarity as keyof typeof rarityColors]}`}>
                                {item.rarity.toUpperCase()}
                              </span>
                            </div>
                          </div>

                          {/* Content Section */}
                          <div className="p-6 flex-grow flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start mb-2">
                                <h3 className="text-xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">
                                  {item.name}
                                </h3>
                                <span className="text-sm font-medium text-gray-500 flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-lg">
                                  <span className="text-green-500">📦</span>
                                  {item.category}
                                </span>
                              </div>
                              <p className="text-gray-600 text-sm mb-4 line-clamp-2">{item.description}</p>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Sold Date</p>
                                <p className="text-sm font-medium text-gray-900">{item.saleDate}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500 mb-1">Sale Price</p>
                                <p className="text-sm font-bold text-green-600">{item.salePrice} ETH</p>
                              </div>
                              <div className="col-span-2">
                                <p className="text-xs text-gray-500 mb-1">Buyer</p>
                                <p className="text-xs font-mono text-gray-700 break-all">{item.buyerAddress}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-20 bg-white/10 backdrop-blur-sm rounded-2xl border-2 border-dashed border-gray-700">
                      <div className="text-6xl mb-4">💰</div>
                      <p className="text-gray-800 text-xl font-semibold mb-2">No items sold yet</p>
                      <p className="text-gray-600">List your created items to start earning!</p>
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
    </div>
  )
}
