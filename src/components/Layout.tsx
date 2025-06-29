import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Home, 
  MessageSquare, 
  FileText, 
  Calendar, 
  Receipt, 
  Settings, 
  Menu, 
  X,
  Wrench,
  ClipboardList,
  ExternalLink
} from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
}

/**
 * Main layout component that provides navigation and structure for the entire application.
 * Features responsive design with mobile hamburger menu and desktop sidebar.
 * 
 * @param children - The main content to render in the layout
 */
const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const location = useLocation()

  // Navigation configuration with icons and routes
  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Messages', href: '/messages', icon: MessageSquare },
    { name: 'Quotes', href: '/quotes', icon: FileText },
    { name: 'Calendar', href: '/calendar', icon: Calendar },
    { name: 'Tech Sheets', href: '/tech-sheets', icon: ClipboardList },
    { name: 'Invoices', href: '/invoices', icon: Receipt },
    { name: 'Settings', href: '/settings', icon: Settings },
  ]

  /**
   * Determines if a navigation item is currently active based on the current route
   */
  const isActive = (href: string) => location.pathname === href

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile header - visible only on small screens */}
      <div className="lg:hidden bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-2">
            <Wrench className="h-8 w-8 text-primary-600" />
            <span className="text-xl font-bold text-gray-900">TorqueSheetGPT</span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu - slides down when hamburger is clicked */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-gray-200">
          <div className="px-2 py-3 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                    isActive(item.href)
                      ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </div>
        </div>
      )}

      <div className="lg:flex">
        {/* Desktop sidebar - hidden on mobile, visible on large screens */}
        <div className="hidden lg:flex lg:flex-shrink-0">
          <div className="flex flex-col w-64">
            <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto">
              {/* Logo and brand */}
              <div className="flex items-center flex-shrink-0 px-4">
                <Wrench className="h-8 w-8 text-primary-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">TorqueSheetGPT</span>
              </div>
              
              {/* Navigation menu */}
              <div className="mt-8 flex-grow flex flex-col">
                <nav className="flex-1 px-2 space-y-1">
                  {navigation.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                          isActive(item.href)
                            ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="mr-3 h-5 w-5" />
                        {item.name}
                      </Link>
                    )
                  })}
                </nav>
                
                {/* Built with Bolt.new badge */}
                <div className="px-2 pb-4">
                  <a
                    href="https://bolt.new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center px-2 py-2 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                  >
                    <ExternalLink className="mr-2 h-3 w-3" />
                    Built with Bolt.new
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 overflow-hidden">
          <main className="flex-1 relative overflow-y-auto focus:outline-none">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {children}
              </div>
            </div>
            
            {/* Mobile "Built with Bolt.new" badge */}
            <div className="lg:hidden px-4 pb-4">
              <a
                href="https://bolt.new"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center px-3 py-2 text-xs text-gray-500 hover:text-gray-700 bg-white border border-gray-200 rounded-md transition-colors"
              >
                <ExternalLink className="mr-2 h-3 w-3" />
                Built with Bolt.new
              </a>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default Layout