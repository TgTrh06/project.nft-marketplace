import { Link } from 'react-router-dom'
import { useAccount } from 'wagmi'

export default function Home() {
  const { isConnected } = useAccount()

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <h1 className="text-7xl font-extrabold text-green-600 mb-6">
              🎮 ItsuMart
            </h1>
            <p className="text-3xl text-gray-700 font-semibold mb-4">
              Buy, sell, and trade game items on the blockchain
            </p>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Discover unique NFTs, manage your collection, and build your gaming empire
            </p>
          </div>

          {!isConnected && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-12 text-center max-w-2xl mx-auto">
              <div className="text-5xl mb-4">🔐</div>
              <p className="text-xl text-gray-700 font-semibold mb-2">
                Connect Your Wallet
              </p>
              <p className="text-gray-600">
                Connect your wallet to start trading and managing your items
              </p>
            </div>
          )}

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
            <Link
              to="/marketplace"
              className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-10 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
            >
              <div className="text-7xl mb-6 transform group-hover:scale-110 transition-transform">🛒</div>
              <h2 className="text-3xl font-extrabold text-gray-900 mb-3 group-hover:text-green-600 transition-colors">
                Marketplace
              </h2>
              <p className="text-gray-600 text-lg">
                Browse and purchase unique game items from other players
              </p>
              <div className="mt-6 text-green-600 font-semibold group-hover:translate-x-2 transition-transform">
                Explore Marketplace →
              </div>
            </Link>

            {isConnected && (
              <Link
                to="/profile"
                className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-10 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
              >
                <div className="text-7xl mb-6 transform group-hover:scale-110 transition-transform">👤</div>
                <h2 className="text-3xl font-extrabold text-gray-900 mb-3 group-hover:text-green-600 transition-colors">
                  Profile
                </h2>
                <p className="text-gray-600 text-lg">
                  View your purchased items, manage your collection, and access seller dashboard
                </p>
                <div className="mt-6 text-green-600 font-semibold group-hover:translate-x-2 transition-transform">
                  View Profile →
                </div>
              </Link>
            )}
          </div>

          {/* Features */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-10">
            <h2 className="text-4xl font-extrabold text-black text-center mb-10">
              Features
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:shadow-lg transition-shadow">
                <div className="text-5xl mb-4">🔗</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Decentralized</h3>
                <p className="text-gray-600">
                  All transactions are secured on the blockchain with full transparency
                </p>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-100 hover:shadow-lg transition-shadow">
                <div className="text-5xl mb-4">💰</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Trade Items</h3>
                <p className="text-gray-600">
                  Buy and sell game items with other players in a secure marketplace
                </p>
              </div>
              <div className="text-center p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:shadow-lg transition-shadow">
                <div className="text-5xl mb-4">📊</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Analytics</h3>
                <p className="text-gray-600">
                  Track your sales, revenue, and manage your inventory as a seller
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

