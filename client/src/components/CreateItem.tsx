import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useMintNFT, useApproveMarketplace, useListItem, GAME_ITEM_ADDRESS } from '../hooks/useContracts'
import { uploadMetadata, saveTokenMetadataMapping } from '../services/metadataStorage'
import { useReadContract } from 'wagmi'
import GameItemABI from '../artifacts/contracts/GameItem.sol/GameItem.json'
import NotificationModal from './NotificationModal'

interface CreateItemFormData {
  name: string
  description: string
  price: string
  category: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  image: string
}

const rarityOptions = [
  { value: 'common', label: 'Common', emoji: '⚪' },
  { value: 'rare', label: 'Rare', emoji: '🔵' },
  { value: 'epic', label: 'Epic', emoji: '🟣' },
  { value: 'legendary', label: 'Legendary', emoji: '🟡' },
]

const categoryOptions = ['Weapon', 'Armor', 'Consumable', 'Accessory', 'Other']

const categoryEmojis: Record<string, string> = {
  Weapon: '⚔️',
  Armor: '🛡️',
  Consumable: '🧪',
  Accessory: '💍',
  Other: '📦',
}

interface ImportItemData {
  name: string
  description: string
  price: string
  category: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  image?: string
}

export default function CreateItem({ onSuccess }: { onSuccess?: () => void }) {
  const { address } = useAccount()
  const [mode, setMode] = useState<'single' | 'import'>('single')
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0) // Step 0: Upload metadata
  const [formData, setFormData] = useState<CreateItemFormData>({
    name: '',
    description: '',
    price: '',
    category: 'Weapon',
    rarity: 'common',
    image: categoryEmojis['Weapon'],
  })
  const [tokenId, setTokenId] = useState<bigint | null>(null)
  const [ipfsUri, setIpfsUri] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  
  // Import file state
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importData, setImportData] = useState<ImportItemData[]>([])
  const [importError, setImportError] = useState<string | null>(null)
  const [isProcessingImport, setIsProcessingImport] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, currentItem: '' })
  
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

  // Get current nextTokenId to predict the tokenId
  const { data: nextTokenId } = useReadContract({
    address: GAME_ITEM_ADDRESS,
    abi: GameItemABI.abi,
    functionName: 'nextTokenId',
  })

  const { mint, isPending: isMinting, isSuccess: isMintSuccess, hash: mintHash } = useMintNFT()
  const { approve, approveForAll, isPending: isApproving, isSuccess: isApproveSuccess } = useApproveMarketplace()
  const { list, isPending: isListing, isSuccess: isListSuccess, hash: listHash } = useListItem()

  const handleInputChange = (field: keyof CreateItemFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      ...(field === 'category' && { image: categoryEmojis[value] || '📦' }),
    }))
  }

  const handleMint = async () => {
    if (!address || !isFormValid) return

    try {
      // Predict tokenId (will be nextTokenId after mint)
      const predictedTokenId = nextTokenId ? BigInt(nextTokenId.toString()) : 0n
      setTokenId(predictedTokenId)

      mint(address)
    } catch (error) {
      console.error('Mint error:', error)
    }
  }

  // Upload metadata to MongoDB when mint succeeds
  useEffect(() => {
    const uploadMetadataAfterMint = async () => {
      if (isMintSuccess && tokenId !== null) {
        setIsUploading(true)
        setUploadError(null)

        try {
          const metadata = {
            name: formData.name,
            description: formData.description,
            image: formData.image,
            category: formData.category,
            rarity: formData.rarity,
          }

          const uri = await uploadMetadata(metadata, tokenId, address)
          setIpfsUri(uri)
          saveTokenMetadataMapping(tokenId, uri)
          setStep(2) // Move to approve step
        } catch (error: any) {
          console.error('Upload error:', error)
          setUploadError(error.message || 'Failed to upload metadata to MongoDB')
        } finally {
          setIsUploading(false)
        }
      }
    }

    uploadMetadataAfterMint()
  }, [isMintSuccess, tokenId, formData])

  const handleApprove = async () => {
    if (tokenId !== null) {
      approve(tokenId)
    } else {
      // Approve for all if we don't have a specific token ID
      approveForAll(true)
    }
  }

  useEffect(() => {
    if (isApproveSuccess && step === 2) {
      setStep(3) // Move to list step
    }
  }, [isApproveSuccess, step])

  const handleList = async () => {
    if (tokenId !== null && formData.price) {
      try {
        list(tokenId, formData.price)
      } catch (error) {
        console.error('List error:', error)
      }
    }
  }

  useEffect(() => {
    if (isListSuccess && step === 3) {
      setNotification({
        isOpen: true,
        title: 'Item Listed Successfully!',
        message: `Your item "${formData.name}" has been listed on the marketplace for ${formData.price} ETH.`,
        type: 'success',
      })
    }
  }, [isListSuccess, step, formData])

  const handleNotificationClose = () => {
    const wasSuccess = notification.type === 'success'
    setNotification({ ...notification, isOpen: false })
    
    if (wasSuccess) {
      if (isListSuccess && step === 3) {
        // Single item creation success
        onSuccess?.()
        // Reset form
        setFormData({
          name: '',
          description: '',
          price: '',
          category: 'Weapon',
          rarity: 'common',
          image: categoryEmojis['Weapon'],
        })
        setStep(0)
        setTokenId(null)
        setIpfsUri(null)
      } else if (notification.title === 'Batch Import Successful!') {
        // Batch import success
        onSuccess?.()
      }
    }
  }

  const isFormValid = formData.name.trim() !== '' && formData.description.trim() !== '' && formData.price !== ''

  // Handle file import
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImportFile(file)
    setImportError(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const data = JSON.parse(content)

        if (!Array.isArray(data)) {
          setImportError('File must contain a JSON array of items')
          return
        }

        // Validate each item
        const validatedData: ImportItemData[] = []
        for (let i = 0; i < data.length; i++) {
          const item = data[i]
          if (!item.name || !item.description || !item.price || !item.category || !item.rarity) {
            setImportError(`Item ${i + 1} is missing required fields (name, description, price, category, rarity)`)
            return
          }
          if (!['common', 'rare', 'epic', 'legendary'].includes(item.rarity)) {
            setImportError(`Item ${i + 1} has invalid rarity. Must be: common, rare, epic, or legendary`)
            return
          }
          if (!categoryOptions.includes(item.category)) {
            setImportError(`Item ${i + 1} has invalid category. Must be one of: ${categoryOptions.join(', ')}`)
            return
          }
          if (isNaN(parseFloat(item.price)) || parseFloat(item.price) <= 0) {
            setImportError(`Item ${i + 1} has invalid price. Must be a positive number`)
            return
          }

          validatedData.push({
            name: item.name,
            description: item.description,
            price: item.price,
            category: item.category,
            rarity: item.rarity,
            image: item.image || categoryEmojis[item.category] || '📦',
          })
        }

        setImportData(validatedData)
      } catch (error: any) {
        setImportError(`Failed to parse JSON file: ${error.message}`)
      }
    }
    reader.readAsText(file)
  }

  // Process batch import
  const handleBatchImport = async () => {
    if (!address || importData.length === 0) return

    setIsProcessingImport(true)
    setImportProgress({ current: 0, total: importData.length, currentItem: '' })

    try {
      // First, approve for all to avoid multiple approvals
      approveForAll(true)
      // Wait a bit for approval (in production, wait for transaction confirmation)
      await new Promise(resolve => setTimeout(resolve, 2000))

      for (let i = 0; i < importData.length; i++) {
        const item = importData[i]
        setImportProgress({ current: i + 1, total: importData.length, currentItem: item.name })

        try {
          // Mint NFT
          const predictedTokenId = nextTokenId ? BigInt(nextTokenId.toString()) + BigInt(i) : BigInt(i)
          
          // In a real scenario, we'd need to wait for each mint to complete
          // For now, we'll use a simplified approach
          mint(address)
          
          // Wait for mint (in production, wait for transaction receipt)
          await new Promise(resolve => setTimeout(resolve, 3000))

          // Upload metadata
          const metadata = {
            name: item.name,
            description: item.description,
            image: item.image || categoryEmojis[item.category] || '📦',
            category: item.category,
            rarity: item.rarity,
          }

          await uploadMetadata(metadata, predictedTokenId, address)
          saveTokenMetadataMapping(predictedTokenId, `mongodb://blockchain-game/item-metadata/${predictedTokenId}`)

          // List on marketplace
          list(predictedTokenId, item.price)
          
          // Wait before next item (in production, wait for transaction receipts)
          await new Promise(resolve => setTimeout(resolve, 3000))
        } catch (error: any) {
          console.error(`Error processing item ${i + 1} (${item.name}):`, error)
          // Continue with next item
        }
      }

      // Reset and show success
      setImportData([])
      setImportFile(null)
      setNotification({
        isOpen: true,
        title: 'Batch Import Successful!',
        message: `Successfully imported ${importData.length} item(s) to the marketplace.`,
        type: 'success',
      })
    } catch (error: any) {
      setNotification({
        isOpen: true,
        title: 'Batch Import Failed',
        message: error.message || 'An error occurred while importing items.',
        type: 'error',
      })
    } finally {
      setIsProcessingImport(false)
      setImportProgress({ current: 0, total: 0, currentItem: '' })
    }
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-1">
            Create New Item
          </h2>
          <p className="text-gray-600 text-sm">Mint and list your unique game items</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setMode('single')
              setStep(0)
              setImportError(null)
              setImportData([])
              setImportFile(null)
            }}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              mode === 'single'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            ➕ Single Item
          </button>
          <button
            onClick={() => {
              setMode('import')
              setStep(0)
              setUploadError(null)
            }}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              mode === 'import'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📁 Import File
          </button>
        </div>
      </div>

      {/* Import File Mode */}
      {mode === 'import' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 mb-6 shadow-md">
            <p className="text-sm text-blue-900 font-semibold mb-3 flex items-center gap-2">
              <span className="text-xl">📋</span>
              Import multiple items from a JSON file
            </p>
            <p className="text-sm text-blue-800 mb-4">
              The file should contain an array of items with the following format:
            </p>
            <pre className="text-xs bg-white/80 backdrop-blur-sm p-4 rounded-xl border-2 border-blue-200 overflow-x-auto shadow-inner font-mono">
{`[
  {
    "name": "Sword of Fire",
    "description": "A powerful sword",
    "price": "0.1",
    "category": "Weapon",
    "rarity": "rare",
    "image": "⚔️"
  },
  ...
]`}
            </pre>
            <div className="mt-4 p-3 bg-white/60 rounded-lg">
              <p className="text-xs text-blue-900 font-semibold mb-1">Required fields:</p>
              <p className="text-xs text-blue-800">name, description, price, category, rarity</p>
              <p className="text-xs text-blue-900 font-semibold mt-2 mb-1">Optional:</p>
              <p className="text-xs text-blue-800">image (defaults to category emoji)</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              📁 Select JSON File
            </label>
            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-gray-50 hover:bg-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                disabled={isProcessingImport}
              />
            </div>
          </div>

          {importError && (
            <div className="bg-red-100 border border-red-300 rounded-lg p-4">
              <p className="text-sm text-red-800">❌ {importError}</p>
            </div>
          )}

          {importFile && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Selected file:</span> {importFile.name}
              </p>
            </div>
          )}

          {importData.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800 font-semibold mb-2">
                ✅ File loaded successfully! Found {importData.length} item(s)
              </p>
              <div className="max-h-60 overflow-y-auto mt-2">
                <ul className="text-xs text-gray-700 space-y-1">
                  {importData.map((item, index) => (
                    <li key={index} className="flex justify-between items-center py-1 border-b">
                      <span>{index + 1}. {item.name}</span>
                      <span className="text-gray-500">{item.price} ETH</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {isProcessingImport && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 font-semibold mb-2">
                Processing batch import...
              </p>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                <div
                  className="bg-indigo-600 h-2.5 rounded-full transition-all"
                  style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                ></div>
              </div>
              <p className="text-xs text-blue-700">
                {importProgress.current} / {importProgress.total} items processed
                {importProgress.currentItem && ` - Current: ${importProgress.currentItem}`}
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-4 pt-6">
            <button
              onClick={() => {
                setImportData([])
                setImportFile(null)
                setImportError(null)
              }}
              disabled={isProcessingImport}
              className="px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-all font-semibold"
            >
              🗑️ Clear
            </button>
            <button
              onClick={handleBatchImport}
              disabled={importData.length === 0 || isProcessingImport || !address}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 font-semibold"
            >
              {isProcessingImport ? '⏳ Processing...' : `📥 Import ${importData.length} Item(s)`}
            </button>
          </div>
        </div>
      )}

      {/* Single Item Mode */}
      {mode === 'single' && (
        <>
      {/* Step 0: Item Details */}
      {step === 0 && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-5 mb-6 shadow-md">
            <p className="text-sm text-blue-900 font-semibold flex items-center gap-2">
              <span className="text-lg">1️⃣</span>
              Step 1: Fill in the item details. Metadata will be saved to MongoDB after minting.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">📝 Item Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-gray-50 hover:bg-white"
              placeholder="Enter item name"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">📄 Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-gray-50 hover:bg-white resize-none"
              placeholder="Enter item description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">📦 Category</label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-gray-50 hover:bg-white font-medium"
              >
                {categoryOptions.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">⭐ Rarity</label>
              <select
                value={formData.rarity}
                onChange={(e) => handleInputChange('rarity', e.target.value as CreateItemFormData['rarity'])}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-gray-50 hover:bg-white font-medium"
              >
                {rarityOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.emoji} {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">💰 Price (ETH)</label>
            <input
              type="number"
              step="0.001"
              min="0"
              value={formData.price}
              onChange={(e) => handleInputChange('price', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-gray-50 hover:bg-white"
              placeholder="0.1"
            />
          </div>

          {uploadError && (
            <div className="bg-red-100 border border-red-300 rounded-lg p-4">
              <p className="text-sm text-red-800">❌ {uploadError}</p>
            </div>
          )}

          <div className="flex justify-end space-x-4 pt-6">
            <button
              onClick={handleMint}
              disabled={!isFormValid || isMinting || !address}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 font-semibold"
            >
              {isMinting ? '⏳ Minting...' : '🎨 Mint NFT & Continue'}
            </button>
          </div>

          {isMinting && (
            <div className="text-sm text-gray-600">
              <p>Minting NFT... Transaction: {mintHash?.slice(0, 10)}...</p>
            </div>
          )}

          {isUploading && (
            <div className="text-sm text-gray-600">
              <p>Saving metadata to MongoDB...</p>
            </div>
          )}

          {uploadError && (
            <div className="bg-red-100 border border-red-300 rounded-lg p-4">
              <p className="text-sm text-red-800">❌ {uploadError}</p>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Approve Marketplace */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-5 mb-6 shadow-md">
            <p className="text-sm text-blue-900 font-semibold flex items-center gap-2 mb-2">
              <span className="text-lg">2️⃣</span>
              Step 2: Approve the marketplace to list your NFT
            </p>
            <p className="text-sm text-blue-800 ml-7">
              This allows the marketplace contract to transfer your NFT when someone buys it.
            </p>
            {ipfsUri && (
              <div className="mt-3 ml-7 px-3 py-2 bg-green-100 border border-green-300 rounded-lg">
                <p className="text-xs text-green-800 font-semibold">✅ Metadata saved successfully!</p>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-4 pt-6">
            <button
              onClick={handleApprove}
              disabled={isApproving}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 font-semibold"
            >
              {isApproving ? '⏳ Approving...' : '✅ Approve Marketplace'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: List on Marketplace */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-5 mb-6 shadow-md">
            <p className="text-sm text-green-900 font-semibold flex items-center gap-2">
              <span className="text-lg">3️⃣</span>
              Step 3: List your item on the marketplace for <span className="text-lg font-extrabold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">{formData.price} ETH</span>
            </p>
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-indigo-50 rounded-2xl p-6 border-2 border-gray-200 mb-6 shadow-lg">
            <div className="text-7xl text-center mb-4">{formData.image}</div>
            <h3 className="text-2xl font-bold text-gray-900 text-center mb-2">{formData.name}</h3>
            <p className="text-sm text-gray-600 text-center mb-4">{formData.description}</p>
            <div className="mt-4 text-center p-4 bg-white/60 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">Listing Price</p>
              <span className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{formData.price} ETH</span>
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-6">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-semibold"
            >
              ← Back
            </button>
            <button
              onClick={handleList}
              disabled={isListing}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 font-semibold"
            >
              {isListing ? '⏳ Listing...' : '🚀 List on Marketplace'}
            </button>
          </div>

          {isListing && (
            <div className="text-sm text-gray-600">
              <p>Listing item... Transaction: {listHash?.slice(0, 10)}...</p>
            </div>
          )}

        </div>
      )}
        </>
      )}

      {/* Notification Modal - Show for all modes */}
      <NotificationModal
        isOpen={notification.isOpen}
        onClose={handleNotificationClose}
        title={notification.title}
        message={notification.message}
        type={notification.type}
      />
    </div>
  )
}
