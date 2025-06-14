'use client';

import React from 'react';
import { 
  LayoutDashboard, 
  Target, 
  Search, 
  Award,
  Package,
  TrendingUp,
  User
} from 'lucide-react';

interface Account {
  id: string;
  name: string;
  currency: string;
  timeZone: string;
  countryCode: string;
  totalClicks?: number;
}

interface NavigationItem {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SidebarProps {
  currentPage: string;
  filteredAccounts: Account[];
  onPageChange: (pageId: string) => void;
}

// Premium navigation structure
const navigationItems: NavigationItem[] = [
  { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
  { id: 'campaigns', name: 'Ad Groups', icon: Target },
  { id: 'keywords', name: 'Keywords', icon: Search },
  { id: 'brands', name: 'Brands', icon: Award },
  { id: 'products', name: 'Products', icon: Package },
  { id: 'poas', name: 'POAS', icon: TrendingUp },
];

const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  filteredAccounts,
  onPageChange
}) => {
  return (
    <aside className="fixed left-0 top-16 bottom-0 w-[240px] bg-white border-r border-gray-200 shadow-sm z-30">
      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navigationItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = currentPage === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onPageChange(item.id)}
                  className={`group w-full flex items-center space-x-3 px-4 py-3 text-left transition-all duration-200 rounded-lg font-medium ${
                    isActive
                      ? 'bg-teal-50 text-teal-700 border-r-2 border-teal-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <IconComponent 
                    className={`h-5 w-5 transition-all duration-200 ${
                      isActive 
                        ? 'text-teal-600' 
                        : 'text-gray-400 group-hover:text-gray-600'
                    }`} 
                  />
                  <span className={`transition-all duration-200 ${
                    isActive ? 'font-semibold' : ''
                  }`}>
                    {item.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom User Section */}
      <div className="p-4 border-t border-gray-100">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">Jasper van der Heide</p>
              <p className="text-xs text-gray-500">
                {filteredAccounts.length > 0 ? `${filteredAccounts.length} accounts` : '3 accounts'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar; 