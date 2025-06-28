import React from 'react'
import { Link } from 'react-router-dom'
import { DivideIcon as LucideIcon } from 'lucide-react'

interface DashboardCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  color: 'blue' | 'green' | 'purple' | 'yellow' | 'red'
  href: string
}

const colorClasses = {
  blue: 'bg-blue-500 text-white',
  green: 'bg-green-500 text-white',
  purple: 'bg-purple-500 text-white',
  yellow: 'bg-yellow-500 text-white',
  red: 'bg-red-500 text-white'
}

const DashboardCard: React.FC<DashboardCardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  href 
}) => {
  return (
    <Link to={href} className="block">
      <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow duration-200">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className={`p-3 rounded-md ${colorClasses[color]}`}>
                <Icon className="h-6 w-6" />
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  {title}
                </dt>
                <dd className="text-lg font-medium text-gray-900">
                  {value}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default DashboardCard