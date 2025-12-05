'use client';

import React, { useState, useEffect } from 'react';
import { Info, Check, AlertCircle, DollarSign, TrendingUp } from 'lucide-react';

// Account type from your accounts list
interface Account {
  id: string;
  name: string;
  currency?: string;
}

interface SettingsViewProps {
  chartType: 'line' | 'bar';
  setChartType: (type: 'line' | 'bar') => void;
  accounts?: Account[];
}

// Local storage key for ProfitMetrics settings
const PROFIT_METRICS_STORAGE_KEY = 'google-ads-dashboard-profit-metrics-accounts';

// Default ProfitMetrics accounts (pre-configured)
const DEFAULT_PROFIT_METRICS_ACCOUNTS = [
  '1946606314', // DE - Online Fussmatten
  '7539242704', // FR - Tapis Voiture
  '5756290882', // NL - Just Carpets
];

const SettingsView: React.FC<SettingsViewProps> = ({
  chartType,
  setChartType,
  accounts = []
}) => {
  // ProfitMetrics account IDs
  const [profitMetricsAccounts, setProfitMetricsAccounts] = useState<Set<string>>(
    new Set(DEFAULT_PROFIT_METRICS_ACCOUNTS)
  );
  const [saved, setSaved] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PROFIT_METRICS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setProfitMetricsAccounts(new Set(parsed));
        }
      }
    } catch (e) {
      console.error('Failed to load ProfitMetrics settings:', e);
    }
  }, []);

  // Toggle an account's ProfitMetrics status
  const toggleProfitMetrics = (accountId: string) => {
    setProfitMetricsAccounts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(accountId)) {
        newSet.delete(accountId);
      } else {
        newSet.add(accountId);
      }
      return newSet;
    });
    setSaved(false);
  };

  // Save settings to localStorage
  const saveSettings = () => {
    try {
      localStorage.setItem(
        PROFIT_METRICS_STORAGE_KEY, 
        JSON.stringify(Array.from(profitMetricsAccounts))
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error('Failed to save ProfitMetrics settings:', e);
    }
  };

  // Get account name by ID
  const getAccountName = (id: string): string => {
    const account = accounts.find(a => a.id === id);
    return account?.name || `Account ${id}`;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Settings Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account preferences and configurations</p>
      </div>

      {/* Settings Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ProfitMetrics Configuration - Full Width */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">ProfitMetrics Accounts</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Select accounts that use ProfitMetrics tracking (where conversion_value = profit, not revenue)
                </p>
              </div>
              <button
                onClick={saveSettings}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  saved 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'bg-teal-600 text-white hover:bg-teal-700'
                }`}
              >
                {saved ? (
                  <span className="flex items-center gap-1.5">
                    <Check className="w-4 h-4" />
                    Saved!
                  </span>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex gap-3">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium mb-1">What is ProfitMetrics?</p>
                  <p>
                    ProfitMetrics accounts track profit directly in Google Ads conversion values. 
                    This means <strong>conversion_value = revenue - product COGS</strong>, not just revenue.
                  </p>
                  <p className="mt-2">
                    For these accounts, the dashboard will show <strong>POAS (Profit on Ad Spend)</strong> instead of ROAS, 
                    and margins are calculated using estimated revenue from product selling prices.
                  </p>
                </div>
              </div>
            </div>

            {/* Account List */}
            <div className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {accounts.length > 0 ? accounts.map(account => {
                  const isProfitMetrics = profitMetricsAccounts.has(account.id);
                  return (
                    <label
                      key={account.id}
                      className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        isProfitMetrics 
                          ? 'border-teal-500 bg-teal-50' 
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isProfitMetrics}
                        onChange={() => toggleProfitMetrics(account.id)}
                        className="w-5 h-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">{account.name}</div>
                        <div className="text-xs text-gray-500">ID: {account.id}</div>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        isProfitMetrics 
                          ? 'bg-teal-100 text-teal-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {isProfitMetrics ? (
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            Profit
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            Revenue
                          </span>
                        )}
                      </div>
                    </label>
                  );
                }) : (
                  // Show default accounts if no accounts provided
                  <div className="col-span-2 text-center py-8 text-gray-500">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p>No accounts available. Make sure accounts are loaded from the API.</p>
                    <p className="text-sm mt-2">
                      Currently configured ProfitMetrics accounts: 
                      <span className="font-mono text-teal-600 ml-1">
                        {Array.from(profitMetricsAccounts).join(', ')}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Summary */}
            {accounts.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>
                    <span className="font-medium text-gray-900">{profitMetricsAccounts.size}</span> account(s) using ProfitMetrics
                  </span>
                  <span>•</span>
                  <span>
                    <span className="font-medium text-gray-900">{accounts.length - profitMetricsAccounts.size}</span> account(s) using standard revenue tracking
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Account Settings */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Display Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Date Range
                </label>
                <select className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500">
                  <option>Last 7 days</option>
                  <option>Last 30 days</option>
                  <option>Last 90 days</option>
                  <option>This month</option>
                  <option>Last month</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Chart Type
                </label>
                <select 
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value as 'line' | 'bar')}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="line">Line Chart</option>
                  <option value="bar">Bar Chart</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Currency Display
                </label>
                <select className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500">
                  <option>EUR (€)</option>
                  <option>USD ($)</option>
                  <option>GBP (£)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Notifications</h3>
            <div className="space-y-3">
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300 text-teal-600 focus:ring-teal-500" defaultChecked />
                <span className="ml-2 text-sm text-gray-700">Email alerts</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                <span className="ml-2 text-sm text-gray-700">Performance alerts</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300 text-teal-600 focus:ring-teal-500" defaultChecked />
                <span className="ml-2 text-sm text-gray-700">Anomaly detection</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView; 