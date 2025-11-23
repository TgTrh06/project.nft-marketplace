import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div
      className="relative min-h-screen bg-cover bg-center"
      style={{ backgroundImage: "url('/image4.gif')" }}
    >
      {/* Lớp phủ đen mờ */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

      {/* Hero Section căn giữa màn hình */}
      <div className="relative z-10 flex items-center justify-center min-h-screen">
        <div className="text-center rounded-2xl p-10">
          <h1 className="text-7xl font-extrabold text-white mb-6">
            ItsuMart
          </h1>
          <p className="text-3xl text-gray-200 font-semibold mb-4">
            Buy, sell, and trade game items on the blockchain
          </p>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Discover unique NFTs, manage your collection, and build your gaming empire
          </p>
          <Link
            to="/marketplace"
            className="inline-block mt-8 px-8 py-4 rounded-xl bg-green-600 text-white font-semibold text-lg shadow-lg hover:bg-green-700 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105"
          >
            Explore Marketplace →
          </Link>
        </div>
      </div>
    </div>
  )
}

