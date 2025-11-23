import { useEffect } from 'react'

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

interface ItemDetailModalProps {
    isOpen: boolean
    onClose: () => void
    item: GameItem | null
    onBuy: (item: GameItem) => void
    isBuying: boolean
    address: string | undefined
    isMyItem: boolean
}

const rarityColors = {
    common: 'bg-gray-100 text-gray-800 border-gray-300',
    rare: 'bg-blue-100 text-blue-900 border-blue-300',
    epic: 'bg-purple-100 text-purple-900 border-purple-300',
    legendary: 'bg-yellow-100 text-yellow-900 border-yellow-400',
}

export default function ItemDetailModal({
    isOpen,
    onClose,
    item,
    onBuy,
    isBuying,
    address,
    isMyItem,
}: ItemDetailModalProps) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen])

    if (!isOpen || !item) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col md:flex-row animate-fadeIn">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 bg-white/50 hover:bg-white rounded-full transition-colors"
                >
                    <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Image Section */}
                <div className="w-full md:w-1/2 bg-gray-50 p-10 flex items-center justify-center relative">
                    <div className="text-9xl filter drop-shadow-2xl transform hover:scale-105 transition-transform duration-500">
                        {item.image.startsWith('http') ? (
                            <img src={item.image} alt={item.name} className="w-64 h-64 object-contain" />
                        ) : (
                            <span>{item.image}</span>
                        )}
                    </div>
                    <div className="absolute top-6 left-6">
                        <span className={`px-4 py-2 rounded-full text-sm font-bold border shadow-sm ${rarityColors[item.rarity]}`}>
                            {item.rarity.toUpperCase()}
                        </span>
                    </div>
                </div>

                {/* Details Section */}
                <div className="w-full md:w-1/2 p-8 md:p-10 flex flex-col">
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                {item.category}
                            </span>
                        </div>
                        <h2 className="text-4xl font-extrabold text-gray-900 mb-4">{item.name}</h2>
                        <p className="text-gray-600 text-lg leading-relaxed">{item.description}</p>
                    </div>

                    <div className="mt-auto space-y-6">
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <p className="text-sm text-gray-500 mb-1">Seller</p>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full"></div>
                                <p className="font-mono text-gray-700 font-medium">
                                    {item.seller.slice(0, 6)}...{item.seller.slice(-4)}
                                </p>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-end mb-4">
                                <div>
                                    <p className="text-sm text-gray-500 font-medium mb-1">Price</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-extrabold text-green-600">{item.price}</span>
                                        <span className="text-xl font-semibold text-gray-400">ETH</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => onBuy(item)}
                                disabled={!address || isMyItem || isBuying}
                                className="w-full py-4 px-6 bg-green-600 text-white text-lg font-bold rounded-xl hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 active:translate-y-0"
                            >
                                {!address
                                    ? '🔗 Connect Wallet to Buy'
                                    : isMyItem
                                        ? '✓ You Own This Item'
                                        : isBuying
                                            ? '⏳ Processing Transaction...'
                                            : '🛒 Buy Now'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
