import React from 'react'
import { 
  MessageSquare, 
  FileText, 
  Calendar, 
  DollarSign,
  Phone,
  Mail,
  Clock,
  AlertTriangle,
  CheckCircle,
  ClipboardList
} from 'lucide-react'
import { Link } from 'react-router-dom'
import DashboardCard from '../components/DashboardCard'
import DoNotDisturbToggle from '../components/DoNotDisturbToggle'
import { useMessages } from '../hooks/useMessages'
import { useQuotes } from '../hooks/useQuotes'
import { useTechSheets } from '../hooks/useTechSheets'

/**
 * Dashboard Component
 * 
 * The main dashboard provides an overview of all business activities including:
 * - Real-time message statistics with emergency alerts
 * - Quote management and revenue tracking
 * - Tech sheet generation statistics
 * - Recent activity feed with priority indicators
 * - Quick action buttons for common tasks
 * - Do Not Disturb toggle for AI response control
 * 
 * The dashboard automatically updates with real-time data and provides
 * visual indicators for urgent items requiring immediate attention.
 */
const Dashboard: React.FC = () => {
  const { messages, getUnreadCount, getEmergencyMessages } = useMessages()
  const { getQuoteStats } = useQuotes()
  const { getTechSheetStats } = useTechSheets()
  
  // Calculate real stats from data
  const unreadMessages = getUnreadCount()
  const emergencyMessages = getEmergencyMessages()
  const quoteStats = getQuoteStats()
  const techSheetStats = getTechSheetStats()
  
  // Mock data for features not yet implemented
  const todayAppointments = 0 // TODO: Implement calendar functionality
  const monthlyRevenue = quoteStats.totalValue

  const recentActivity = [
    ...emergencyMessages.slice(0, 2).map(msg => ({
      id: msg.id,
      type: 'emergency' as const,
      content: `Emergency message from ${msg.phone_number}: ${msg.body.substring(0, 50)}...`,
      time: new Date(msg.timestamp).toLocaleString(),
      urgent: true
    })),
    ...messages
      .filter(msg => msg.direction === 'inbound' && !msg.intent?.toLowerCase().includes('emergency'))
      .slice(0, 3)
      .map(msg => ({
        id: msg.id,
        type: 'message' as const,
        content: `New message from ${msg.phone_number}: ${msg.body.substring(0, 50)}...`,
        time: new Date(msg.timestamp).toLocaleString(),
        urgent: false
      }))
  ].slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back! Here's what's happening in your shop today.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <DoNotDisturbToggle />
        </div>
      </div>

      {/* Emergency Alert */}
      {emergencyMessages.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                🚨 {emergencyMessages.length} Emergency Message{emergencyMessages.length > 1 ? 's' : ''} Received
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  You have urgent messages that require immediate attention.{' '}
                  <Link to="/messages" className="font-medium underline hover:text-red-900">
                    View emergency messages →
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Unread Messages"
          value={unreadMessages}
          icon={MessageSquare}
          color="blue"
          href="/messages"
        />
        <DashboardCard
          title="Active Quotes"
          value={quoteStats.active}
          icon={FileText}
          color="green"
          href="/quotes"
        />
        <DashboardCard
          title="Tech Sheets"
          value={techSheetStats.total}
          icon={ClipboardList}
          color="purple"
          href="/tech-sheets"
        />
        <DashboardCard
          title="Monthly Revenue"
          value={`$${monthlyRevenue.toLocaleString()}`}
          icon={DollarSign}
          color="yellow"
          href="/invoices"
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Recent Activity
          </h3>
          {recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 ${activity.urgent ? 'text-red-500' : 'text-gray-400'}`}>
                    {activity.type === 'message' && <MessageSquare className="h-5 w-5" />}
                    {activity.type === 'quote' && <FileText className="h-5 w-5" />}
                    {activity.type === 'emergency' && <AlertTriangle className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${activity.urgent ? 'text-red-900 font-medium' : 'text-gray-900'}`}>
                      {activity.content}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {activity.time}
                    </p>
                  </div>
                  {activity.urgent && (
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Urgent
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">All caught up!</h3>
              <p className="mt-1 text-sm text-gray-500">
                No recent activity to show.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link
              to="/messages"
              className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <MessageSquare className="h-5 w-5 mr-2" />
              View Messages
            </Link>
            <Link
              to="/quotes"
              className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <FileText className="h-5 w-5 mr-2" />
              Create Quote
            </Link>
            <Link
              to="/tech-sheets"
              className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <ClipboardList className="h-5 w-5 mr-2" />
              Generate Tech Sheet
            </Link>
            <Link
              to="/settings"
              className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <Clock className="h-5 w-5 mr-2" />
              Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard