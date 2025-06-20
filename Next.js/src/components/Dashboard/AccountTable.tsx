'use client';

import React, { useMemo } from 'react';
import { Award } from 'lucide-react';
import { MccOverviewData, AccountMetrics } from '../../types';
import { formatNumber, formatCurrency, formatPercentage } from '../../utils';
import { calculateAccountHealthScore } from '../../utils/accountHealthScoring';
import { getPerformanceLevel, PerformanceIndicator, TableTotalsRow } from './shared';
import { getHealthScoreStyles } from '../../utils/accountHealthScoring';

interface AccountTableProps {
  data: MccOverviewData | null;
  loading: boolean;
  searchTerm: string;
  pageSize: number;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  statusFilter: 'active' | 'all';
  onSort: (column: string) => void;
  onAccountClick: (account: AccountMetrics) => void;
  onMetricHover?: (event: React.MouseEvent, metricType: string, metricValue: string | number, accountName: string, accountId: string) => void;
  onMetricLeave?: (metricType?: string) => void;
  selectedAccounts?: string[];
  onAccountSelect?: (accountId: string, isSelected: boolean) => void;
}

const AccountTable: React.FC<AccountTableProps> = ({
  data,
  loading,
  searchTerm,
  pageSize,
  sortColumn,
  sortDirection,
  statusFilter,
  onSort,
  onAccountClick,
  onMetricHover,
  onMetricLeave,
  selectedAccounts = [],
  onAccountSelect
}) => {
  // Calculate totals for table footer
  const calculatedTotals = useMemo(() => {
    if (!data?.accounts) return null;
    
    const filteredAccounts = data.accounts.filter(account => {
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && (account.metrics.impressions > 0 || account.metrics.clicks > 0));
      const matchesSearch = !searchTerm || account.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });

    // Calculate health scores for average
    const healthScores = filteredAccounts.map(account => {
      const healthScore = calculateAccountHealthScore(account);
      return {
        score: healthScore.overall,
        grade: healthScore.grade
      };
    });

    const avgHealthScore = healthScores.length > 0 
      ? Math.round(healthScores.reduce((sum, h) => sum + h.score, 0) / healthScores.length)
      : 0;

    // Calculate average grade based on average score
    const getGradeFromScore = (score: number): string => {
      if (score >= 90) return 'A+';
      if (score >= 85) return 'A';
      if (score >= 80) return 'A-';
      if (score >= 75) return 'B+';
      if (score >= 70) return 'B';
      if (score >= 65) return 'B-';
      if (score >= 60) return 'C+';
      if (score >= 55) return 'C';
      if (score >= 50) return 'C-';
      if (score >= 45) return 'D+';
      if (score >= 40) return 'D';
      if (score >= 35) return 'D-';
      return 'F';
    };

    return {
      clicks: filteredAccounts.reduce((sum, acc) => sum + acc.metrics.clicks, 0),
      impressions: filteredAccounts.reduce((sum, acc) => sum + acc.metrics.impressions, 0),
      cost: filteredAccounts.reduce((sum, acc) => sum + acc.metrics.cost, 0),
      conversions: filteredAccounts.reduce((sum, acc) => sum + acc.metrics.conversions, 0),
      conversionsValue: filteredAccounts.reduce((sum, acc) => sum + acc.metrics.conversionsValue, 0),
      ctr: filteredAccounts.length > 0 ? filteredAccounts.reduce((sum, acc) => sum + acc.metrics.ctr, 0) / filteredAccounts.length : 0,
      avgCpc: filteredAccounts.length > 0 ? filteredAccounts.reduce((sum, acc) => sum + acc.metrics.avgCpc, 0) / filteredAccounts.length : 0,
      cpa: filteredAccounts.length > 0 ? filteredAccounts.reduce((sum, acc) => sum + acc.metrics.cpa, 0) / filteredAccounts.length : 0,
      roas: filteredAccounts.length > 0 ? filteredAccounts.reduce((sum, acc) => sum + acc.metrics.roas, 0) / filteredAccounts.length : 0,
      accountCount: filteredAccounts.length,
      campaignCount: filteredAccounts.reduce((sum, acc) => sum + acc.campaignCount, 0),
      avgHealthScore: avgHealthScore,
      avgHealthGrade: getGradeFromScore(avgHealthScore)
    };
  }, [data, statusFilter, searchTerm]);

  // Pre-calculate health scores for all filtered accounts (moved before early returns)
  const accountsWithHealthScores = useMemo(() => {
    if (!data?.accounts) return [];
    
    const filteredAccounts = data.accounts
      .filter(account => {
        const matchesStatus = statusFilter === 'all' || 
          (statusFilter === 'active' && (account.metrics.impressions > 0 || account.metrics.clicks > 0));
        const matchesSearch = !searchTerm || account.name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        let aValue: any, bValue: any;
        
        // Handle nested metrics
        if (sortColumn.startsWith('metrics.')) {
          const metricKey = sortColumn.replace('metrics.', '') as keyof AccountMetrics['metrics'];
          aValue = a.metrics[metricKey];
          bValue = b.metrics[metricKey];
        } else if (sortColumn === 'healthScore') {
          // Handle health score sorting
          const aHealthScore = calculateAccountHealthScore(a);
          const bHealthScore = calculateAccountHealthScore(b);
          aValue = aHealthScore.overall;
          bValue = bHealthScore.overall;
        } else {
          aValue = a[sortColumn as keyof AccountMetrics];
          bValue = b[sortColumn as keyof AccountMetrics];
        }
        
        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = (bValue as string).toLowerCase();
        }
        
        // Handle undefined/null values
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return sortDirection === 'asc' ? 1 : -1;
        if (bValue == null) return sortDirection === 'asc' ? -1 : 1;
        
        if (sortDirection === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      })
      .slice(0, pageSize);

    return filteredAccounts.map(account => {
      const healthScore = calculateAccountHealthScore(account);
      return {
        ...account,
        healthScore: healthScore.overall,
        healthGrade: healthScore.grade,
        healthStatus: healthScore.status,
        healthStyles: getHealthScoreStyles(healthScore.overall)
      };
    });
  }, [data, statusFilter, searchTerm, sortColumn, sortDirection, pageSize]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data || !data.accounts) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No account data available</p>
      </div>
    );
  }

  // Calculate performance levels for all metrics
  const allClicks = accountsWithHealthScores.map(a => a.metrics.clicks);
  const allImpressions = accountsWithHealthScores.map(a => a.metrics.impressions);
  const allCtr = accountsWithHealthScores.map(a => a.metrics.ctr);
  const allAvgCpc = accountsWithHealthScores.map(a => a.metrics.avgCpc);
  const allCost = accountsWithHealthScores.map(a => a.metrics.cost);
  const allConversions = accountsWithHealthScores.map(a => a.metrics.conversions);
  const allCpa = accountsWithHealthScores.map(a => a.metrics.cpa);
  const allConversionsValue = accountsWithHealthScores.map(a => a.metrics.conversionsValue);
  const allRoas = accountsWithHealthScores.map(a => a.metrics.roas);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {onAccountSelect && (
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  checked={selectedAccounts.length === accountsWithHealthScores.length && accountsWithHealthScores.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      // Select all visible accounts
                      accountsWithHealthScores.forEach(account => {
                        if (!selectedAccounts.includes(account.id)) {
                          onAccountSelect(account.id, true);
                        }
                      });
                    } else {
                      // Deselect all visible accounts
                      accountsWithHealthScores.forEach(account => {
                        if (selectedAccounts.includes(account.id)) {
                          onAccountSelect(account.id, false);
                        }
                      });
                    }
                  }}
                />
              </th>
            )}
            <th 
              className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors duration-200"
              onClick={() => onSort('name')}
            >
              <div className="flex items-center space-x-1">
                <span>Account Name</span>
                {sortColumn === 'name' && (
                  <span className="text-teal-600">
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </div>
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('countryCode')}
            >
              Country
              {sortColumn === 'countryCode' && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('campaignCount')}
            >
              Campaigns
              {sortColumn === 'campaignCount' && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('healthScore')}
            >
              <div className="flex items-center space-x-1">
                <Award className="w-3 h-3" />
                <span>Grade</span>
              </div>
              {sortColumn === 'healthScore' && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th className="px-1 py-3 w-px border-r border-gray-300">
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('metrics.clicks')}
            >
              Clicks
              {sortColumn === 'metrics.clicks' && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('metrics.impressions')}
            >
              Impressions
              {sortColumn === 'metrics.impressions' && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('metrics.ctr')}
            >
              CTR
              {sortColumn === 'metrics.ctr' && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('metrics.avgCpc')}
            >
              CPC
              {sortColumn === 'metrics.avgCpc' && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('metrics.cost')}
            >
              Cost
              {sortColumn === 'metrics.cost' && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('metrics.conversions')}
            >
              Conversions
              {sortColumn === 'metrics.conversions' && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('metrics.cpa')}
            >
              CPA
              {sortColumn === 'metrics.cpa' && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('metrics.conversionsValue')}
            >
              Conversion Value
              {sortColumn === 'metrics.conversionsValue' && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('metrics.roas')}
            >
              ROAS
              {sortColumn === 'metrics.roas' && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {accountsWithHealthScores.map((account) => (
            <tr 
              key={account.id} 
              className="hover:bg-gray-50"
            >
              {onAccountSelect && (
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    checked={selectedAccounts.includes(account.id)}
                    onChange={(e) => onAccountSelect(account.id, e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </td>
              )}
              <td 
                className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 cursor-pointer"
                onClick={() => onAccountClick(account)}
              >
                <div className="flex items-center">
                  <div>
                    <div className="font-medium">{account.name}</div>
                    {account.topCampaign && (
                      <div className="text-xs text-gray-500 mt-1">
                        Top: {account.topCampaign}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {account.countryCode}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatNumber(account.campaignCount)}
              </td>
              <td 
                className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors rounded px-2 py-1"
                onMouseEnter={onMetricHover ? (e) => onMetricHover(e, 'healthScore', account.healthScore, account.name, account.id) : undefined}
                onMouseLeave={() => onMetricLeave?.('healthScore')}
              >
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${account.healthStyles.color}`} />
                  <div className="flex items-center space-x-1">
                    <span className="font-medium">{account.healthScore}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${account.healthStyles.bgColor} ${account.healthStyles.textColor} ${account.healthStyles.borderColor} border`}>
                      {account.healthGrade}
                    </span>
                  </div>
                </div>
              </td>
              <td className="px-1 py-4 w-px border-r border-gray-300">
              </td>
              <td 
                className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors rounded px-2 py-1"
                onMouseEnter={onMetricHover ? (e) => onMetricHover(e, 'clicks', account.metrics.clicks, account.name, account.id) : undefined}
                onMouseLeave={() => onMetricLeave?.('clicks')}
              >
                <div className="flex items-center">
                  <PerformanceIndicator level={getPerformanceLevel(account.metrics.clicks, allClicks, 'clicks')} />
                  {formatNumber(account.metrics.clicks)}
                </div>
              </td>
              <td 
                className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors rounded px-2 py-1"
                onMouseEnter={onMetricHover ? (e) => onMetricHover(e, 'impressions', account.metrics.impressions, account.name, account.id) : undefined}
                onMouseLeave={() => onMetricLeave?.('impressions')}
              >
                <div className="flex items-center">
                  <PerformanceIndicator level={getPerformanceLevel(account.metrics.impressions, allImpressions, 'impressions')} />
                  {formatNumber(account.metrics.impressions)}
                </div>
              </td>
              <td 
                className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors rounded px-2 py-1"
                onMouseEnter={onMetricHover ? (e) => onMetricHover(e, 'ctr', account.metrics.ctr, account.name, account.id) : undefined}
                onMouseLeave={() => onMetricLeave?.('ctr')}
              >
                <div className="flex items-center">
                  <PerformanceIndicator level={getPerformanceLevel(account.metrics.ctr, allCtr, 'ctr')} />
                  {formatPercentage(account.metrics.ctr)}
                </div>
              </td>
              <td 
                className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors rounded px-2 py-1"
                onMouseEnter={onMetricHover ? (e) => onMetricHover(e, 'avgCpc', account.metrics.avgCpc, account.name, account.id) : undefined}
                onMouseLeave={() => onMetricLeave?.('avgCpc')}
              >
                <div className="flex items-center">
                  <PerformanceIndicator level={getPerformanceLevel(account.metrics.avgCpc, allAvgCpc, 'avgCpc')} />
                  {formatCurrency(account.metrics.avgCpc)}
                </div>
              </td>
              <td 
                className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors rounded px-2 py-1"
                onMouseEnter={onMetricHover ? (e) => onMetricHover(e, 'cost', account.metrics.cost, account.name, account.id) : undefined}
                onMouseLeave={() => onMetricLeave?.('cost')}
              >
                <div className="flex items-center">
                  <PerformanceIndicator level={getPerformanceLevel(account.metrics.cost, allCost, 'cost')} />
                  {formatCurrency(account.metrics.cost)}
                </div>
              </td>
              <td 
                className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors rounded px-2 py-1"
                onMouseEnter={onMetricHover ? (e) => onMetricHover(e, 'conversions', account.metrics.conversions, account.name, account.id) : undefined}
                onMouseLeave={() => onMetricLeave?.('conversions')}
              >
                <div className="flex items-center">
                  <PerformanceIndicator level={getPerformanceLevel(account.metrics.conversions, allConversions, 'conversions')} />
                  {formatNumber(account.metrics.conversions)}
                </div>
              </td>
              <td 
                className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors rounded px-2 py-1"
                onMouseEnter={onMetricHover ? (e) => onMetricHover(e, 'cpa', account.metrics.cpa, account.name, account.id) : undefined}
                onMouseLeave={() => onMetricLeave?.('cpa')}
              >
                <div className="flex items-center">
                  <PerformanceIndicator level={getPerformanceLevel(account.metrics.cpa, allCpa, 'cpa')} />
                  {formatCurrency(account.metrics.cpa)}
                </div>
              </td>
              <td 
                className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors rounded px-2 py-1"
                onMouseEnter={onMetricHover ? (e) => onMetricHover(e, 'conversionsValue', account.metrics.conversionsValue, account.name, account.id) : undefined}
                onMouseLeave={() => onMetricLeave?.('conversionsValue')}
              >
                <div className="flex items-center">
                  <PerformanceIndicator level={getPerformanceLevel(account.metrics.conversionsValue, allConversionsValue, 'conversionsValue')} />
                  {formatCurrency(account.metrics.conversionsValue)}
                </div>
              </td>
              <td 
                className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors rounded px-2 py-1"
                onMouseEnter={onMetricHover ? (e) => onMetricHover(e, 'roas', account.metrics.roas, account.name, account.id) : undefined}
                onMouseLeave={() => onMetricLeave?.('roas')}
              >
                <div className="flex items-center">
                  <PerformanceIndicator level={getPerformanceLevel(account.metrics.roas, allRoas, 'roas')} />
                  {account.metrics.roas.toFixed(2)}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        {calculatedTotals && (
          <TableTotalsRow 
            totals={calculatedTotals}
            itemCount={accountsWithHealthScores.length}
            itemType="accounts"
            showCheckboxColumn={!!onAccountSelect}
          />
        )}
      </table>
    </div>
  );
};

export default AccountTable; 