import { Link, useLocation } from 'react-router-dom'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'

export default function Navbar() {
  const location = useLocation()
  const { isConnected } = useAccount()

  const isActive = (path: string) => location.pathname === path

  return (
    <nav className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-gray-200 sticky top-0 z-40">
      <div className="container max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-3xl font-extrabold text-green-600 hover:scale-105 transition-transform">
              ItsuMart
            </Link>
            <div className="flex space-x-2">
              <Link
                to="/marketplace"
                className={`px-5 py-2.5 rounded-xl font-semibold transition-all ${isActive('/marketplace')
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'text-gray-700 hover:bg-gray-100'
                  }`}
              >
                🛒 Marketplace
              </Link>
              {isConnected && (
                <Link
                  to="/profile"
                  className={`px-5 py-2.5 rounded-xl font-semibold transition-all ${isActive('/profile')
                    ? 'bg-green-600 text-white shadow-lg'
                    : 'text-gray-700 hover:bg-gray-100'
                    }`}
                >
                  👤 Profile
                </Link>
              )}
            </div>
          </div>
          <ConnectButton />
        </div>
      </div>
    </nav>
  )
}

