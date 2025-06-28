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
  CheckCircle
} from 'lucide-react'
import DashboardCard from '../components/DashboardCard'
import DoNotDisturbToggle from '../components/DoNotDisturbToggle'

const Dashboard: React.FC = () => {
  // Mock data - will be replaced with real data from APIs
  const stats = {
    pendingMessages: 3,
    activeQuotes: 5,
    todayAppointments: 2,
    monthlyRevenue: 8450
  }

  const recentActivity = [
    {
      id: 1,
      type: 'message',
      content: 'New SMS from John Smith about brake noise',
      time: '5 minutes ago',
      urgent: false
    },
    {
      id: 2,
      type: 'quote',
      content: 'Quote #QT-001 sent to Sarah Johnson',
      time: '15 minutes ago',
      urgent: false
    },
    {
      id: 3,
      type: 'emergency',
      content: 'Emergency call from Mike Wilson - car won\'t start',
      time: '1 hour ago',
      urgent: true
    }
  ]

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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Pending Messages"
          value={stats.pendingMessages}
          icon={MessageSquare}
          color="blue"
          href="/messages"
        />
        <DashboardCard
          title="Active Quotes"
          value={stats.activeQuotes}
          icon={FileText}
          color="green"
          href="/quotes"
        />
        <DashboardCard
          title="Today's Appointments"
          value={stats.todayAppointments}
          icon={Calendar}
          color="purple"
          href="/calendar"
        />
        <DashboardCard
          title="Monthly Revenue"
          value={`$${stats.monthlyRevenue.toLocaleString()}`}
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
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
              <Phone className="h-5 w-5 mr-2" />
              Check Voicemails
            </button>
            <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
              <Mail className="h-5 w-5 mr-2" />
              Review Emails
            </button>
            <button className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
              <FileText className="h-5 w-5 mr-2" />
              Create Quote
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard