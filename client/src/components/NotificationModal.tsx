import { useEffect } from 'react'

interface NotificationModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  type?: 'success' | 'error' | 'info' | 'warning'
}

export default function NotificationModal({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
}: NotificationModalProps) {
  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const typeStyles = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-300',
      title: 'text-green-800',
      message: 'text-green-700',
      button: 'bg-green-600 hover:bg-green-700',
      icon: '✅',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-300',
      title: 'text-red-800',
      message: 'text-red-700',
      button: 'bg-red-600 hover:bg-red-700',
      icon: '❌',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-300',
      title: 'text-yellow-800',
      message: 'text-yellow-700',
      button: 'bg-yellow-600 hover:bg-yellow-700',
      icon: '⚠️',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-300',
      title: 'text-blue-800',
      message: 'text-blue-700',
      button: 'bg-blue-600 hover:bg-blue-700',
      icon: 'ℹ️',
    },
  }

  const styles = typeStyles[type]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full transform transition-all">
        <div className={`${styles.bg} ${styles.border} border-t-4 rounded-t-lg p-6`}>
          <div className="flex items-start">
            <div className="flex-shrink-0 text-3xl mr-4">{styles.icon}</div>
            <div className="flex-1">
              <h3 className={`text-lg font-bold ${styles.title} mb-2`}>{title}</h3>
              <p className={`text-sm ${styles.message}`}>{message}</p>
            </div>
          </div>
        </div>

        <div className="bg-white px-6 py-4 rounded-b-lg">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className={`${styles.button} text-white px-6 py-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

