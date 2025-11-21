import express from 'express'
import cors from 'cors'
import { MongoClient, Db, Collection } from 'mongodb'

const app = express()
const PORT = process.env.PORT || 3001

// MongoDB connection URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://itsuki-0604:123456789i@itsuki-no-tabi.5dliqhr.mongodb.net/?retryWrites=true&w=majority&appName=itsuki-no-tabi'

const DB_NAME = 'blockchain-game'
const COLLECTION_NAME = 'item-metadata'
const PURCHASES_COLLECTION_NAME = 'purchases'

interface ItemMetadata {
  name: string
  description: string
  image: string
  category: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  attributes?: Array<{
    trait_type: string
    value: string | number
  }>
}

interface StoredMetadata extends ItemMetadata {
  tokenId: string
  sellerAddress?: string
  createdAt: Date
  updatedAt: Date
}

interface Purchase {
  buyerAddress: string
  sellerAddress: string
  tokenId: string
  listingId: number
  price: string // in ETH
  transactionHash: string
  purchasedAt: Date
}

// MongoDB client singleton
let client: MongoClient | null = null
let db: Db | null = null

async function getClient(): Promise<MongoClient> {
  if (!client) {
    try {
      client = new MongoClient(MONGODB_URI)
      await client.connect()
      console.log('Connected to MongoDB')
    } catch (error: any) {
      console.error('Failed to connect to MongoDB:', error)
      throw new Error(`MongoDB connection error: ${error.message}`)
    }
  }
  return client
}

async function getDatabase(): Promise<Db> {
  if (!db) {
    const mongoClient = await getClient()
    db = mongoClient.db(DB_NAME)
  }
  return db
}

async function getCollection(): Promise<Collection<StoredMetadata>> {
  const database = await getDatabase()
  return database.collection<StoredMetadata>(COLLECTION_NAME)
}

async function getPurchasesCollection(): Promise<Collection<Purchase>> {
  const database = await getDatabase()
  return database.collection<Purchase>(PURCHASES_COLLECTION_NAME)
}

// Middleware
app.use(cors())
app.use(express.json())

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'API server is running' })
})

// Upload metadata
app.post('/api/metadata', async (req, res) => {
  try {
    const { metadata, tokenId, sellerAddress } = req.body

    if (!metadata || !tokenId) {
      return res.status(400).json({ error: 'Missing metadata or tokenId' })
    }

    const collection = await getCollection()

    const storedMetadata: StoredMetadata = {
      ...metadata,
      tokenId: tokenId.toString(),
      sellerAddress: sellerAddress || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await collection.updateOne(
      { tokenId: tokenId.toString() },
      { $set: storedMetadata },
      { upsert: true }
    )

    res.json({
      success: true,
      uri: `mongodb://${DB_NAME}/${COLLECTION_NAME}/${tokenId}`,
    })
  } catch (error: any) {
    console.error('Error uploading metadata:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get metadata by tokenId
app.get('/api/metadata/:tokenId', async (req, res) => {
  try {
    const { tokenId } = req.params
    const collection = await getCollection()

    const result = await collection.findOne({ tokenId })

    if (!result) {
      return res.status(404).json({ error: 'Metadata not found' })
    }

    // Return metadata without MongoDB-specific fields
    const { _id, createdAt, updatedAt, ...metadata } = result
    res.json(metadata)
  } catch (error: any) {
    console.error('Error fetching metadata:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get multiple metadata by tokenIds
app.post('/api/metadata/batch', async (req, res) => {
  try {
    const { tokenIds } = req.body

    if (!Array.isArray(tokenIds)) {
      return res.status(400).json({ error: 'tokenIds must be an array' })
    }

    const collection = await getCollection()
    const results = await collection
      .find({ tokenId: { $in: tokenIds.map((id: bigint | string) => id.toString()) } })
      .toArray()

    const metadata = results.map(({ _id: _unused, createdAt: _createdAt, updatedAt: _updatedAt, ...meta }) => meta)
    res.json(metadata)
  } catch (error: any) {
    console.error('Error fetching batch metadata:', error)
    res.status(500).json({ error: error.message })
  }
})

// Save purchase transaction
app.post('/api/purchases', async (req, res) => {
  try {
    const { buyerAddress, sellerAddress, tokenId, listingId, price, transactionHash } = req.body

    if (!buyerAddress || !sellerAddress || !tokenId || listingId === undefined || !price || !transactionHash) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const purchasesCollection = await getPurchasesCollection()

    const purchase: Purchase = {
      buyerAddress: buyerAddress.toLowerCase(),
      sellerAddress: sellerAddress.toLowerCase(),
      tokenId: tokenId.toString(),
      listingId: Number(listingId),
      price: price.toString(),
      transactionHash,
      purchasedAt: new Date(),
    }

    await purchasesCollection.insertOne(purchase)

    res.json({ success: true, purchase })
  } catch (error: any) {
    console.error('Error saving purchase:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get purchases by buyer address
app.get('/api/purchases/:buyerAddress', async (req, res) => {
  try {
    const { buyerAddress } = req.params
    const purchasesCollection = await getPurchasesCollection()

    const purchases = await purchasesCollection
      .find({ buyerAddress: buyerAddress.toLowerCase() })
      .sort({ purchasedAt: -1 })
      .toArray()

    res.json(purchases)
  } catch (error: any) {
    console.error('Error fetching purchases:', error)
    res.status(500).json({ error: error.message })
  }
})

// Get sales by seller address
app.get('/api/sales/:sellerAddress', async (req, res) => {
  try {
    const { sellerAddress } = req.params
    const purchasesCollection = await getPurchasesCollection()

    const sales = await purchasesCollection
      .find({ sellerAddress: sellerAddress.toLowerCase() })
      .sort({ purchasedAt: -1 })
      .toArray()

    res.json(sales)
  } catch (error: any) {
    console.error('Error fetching sales:', error)
    res.status(500).json({ error: error.message })
  }
})

// Start server
async function startServer() {
  try {
    // Test MongoDB connection
    await getClient()
    console.log('MongoDB connection established')

    app.listen(PORT, () => {
      console.log(`API server running on http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()

// Graceful shutdown
process.on('SIGINT', async () => {
  if (client) {
    await client.close()
    console.log('MongoDB connection closed')
  }
  process.exit(0)
})

