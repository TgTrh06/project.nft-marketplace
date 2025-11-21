// Client-side service to interact with MongoDB API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export interface ItemMetadata {
  name: string
  description: string
  image: string // Emoji hoặc URL
  category: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  attributes?: Array<{
    trait_type: string
    value: string | number
  }>
}

/**
 * Upload metadata lên MongoDB qua API và trả về URI
 */
export async function uploadMetadata(metadata: ItemMetadata, tokenId: bigint, sellerAddress?: string): Promise<string> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/metadata`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        metadata,
        tokenId: tokenId.toString(),
        sellerAddress,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to upload metadata')
    }

    const result = await response.json()
    return result.uri
  } catch (error: any) {
    console.error('Error uploading metadata:', error)
    throw new Error(`Failed to save metadata: ${error.message}`)
  }
}

/**
 * Fetch metadata từ MongoDB qua API bằng tokenId
 */
export async function fetchMetadataByTokenId(tokenId: bigint): Promise<ItemMetadata | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/metadata/${tokenId.toString()}`)

    if (response.status === 404) {
      return null
    }

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch metadata')
    }

    const metadata = await response.json()
    return metadata
  } catch (error: any) {
    console.error('Error fetching metadata:', error)
    return null
  }
}

/**
 * Fetch metadata từ URI (for compatibility)
 */
export async function fetchMetadata(uri: string): Promise<ItemMetadata | null> {
  try {
    // Extract tokenId from URI format: mongodb://db/collection/tokenId
    const match = uri.match(/mongodb:\/\/[^/]+\/[^/]+\/(.+)/)
    if (match) {
      const tokenId = BigInt(match[1])
      return fetchMetadataByTokenId(tokenId)
    }
    return null
  } catch (error) {
    console.error('Error fetching metadata from URI:', error)
    return null
  }
}

/**
 * Fetch multiple metadata by tokenIds
 */
export async function fetchMetadataBatch(tokenIds: bigint[]): Promise<ItemMetadata[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/metadata/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tokenIds: tokenIds.map(id => id.toString()),
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch batch metadata')
    }

    const metadata = await response.json()
    return metadata
  } catch (error: any) {
    console.error('Error fetching batch metadata:', error)
    return []
  }
}

/**
 * Save purchase transaction
 */
export async function savePurchase(purchase: {
  buyerAddress: string
  sellerAddress: string
  tokenId: bigint
  listingId: number
  price: string
  transactionHash: string
}): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/purchases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...purchase,
        tokenId: purchase.tokenId.toString(),
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to save purchase')
    }
  } catch (error: any) {
    console.error('Error saving purchase:', error)
    throw error
  }
}

/**
 * Get purchases by buyer address
 */
export async function getPurchases(buyerAddress: string): Promise<any[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/purchases/${buyerAddress}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch purchases')
    }

    return await response.json()
  } catch (error: any) {
    console.error('Error fetching purchases:', error)
    return []
  }
}

/**
 * Get sales by seller address
 */
export async function getSales(sellerAddress: string): Promise<any[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/sales/${sellerAddress}`)

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch sales')
    }

    return await response.json()
  } catch (error: any) {
    console.error('Error fetching sales:', error)
    return []
  }
}

/**
 * Lưu mapping tokenId -> URI vào localStorage (for compatibility)
 */
export function saveTokenMetadataMapping(tokenId: bigint, uri: string) {
  try {
    const mappings = getTokenMetadataMappings()
    mappings[tokenId.toString()] = uri
    localStorage.setItem('tokenMetadataMappings', JSON.stringify(mappings))
  } catch (error) {
    console.error('Error saving token metadata mapping:', error)
  }
}

/**
 * Lấy URI từ tokenId (for compatibility)
 */
export function getTokenMetadataUri(tokenId: bigint): string | null {
  try {
    const mappings = getTokenMetadataMappings()
    return mappings[tokenId.toString()] || null
  } catch (error) {
    console.error('Error getting token metadata URI:', error)
    return null
  }
}

/**
 * Lấy tất cả mappings
 */
function getTokenMetadataMappings(): Record<string, string> {
  try {
    const stored = localStorage.getItem('tokenMetadataMappings')
    return stored ? JSON.parse(stored) : {}
  } catch (error) {
    console.error('Error getting token metadata mappings:', error)
    return {}
  }
}
