'use client';

import React, { useMemo, useState } from 'react';
import { Award, ChevronDown, ChevronRight } from 'lucide-react';
import { MccOverviewData, AccountMetrics } from '../../types';
import { formatNumber, formatCurrency, formatPercentage } from '../../utils';
import { calculateAccountHealthScore } from '../../utils/accountHealthScoring';
import { TableTotalsRow } from './shared';
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

// Trend indicator - subtle arrow with colored background in fixed-width container
const TrendIndicator: React.FC<{ 
  value: number | undefined; 
  inverted?: boolean;
}> = ({ value, inverted = false }) => {
  if (value === undefined || value === null) return <span className="w-6 inline-block"></span>;
  
  const roundedValue = Math.round(value * 10) / 10;
  const isPositive = inverted ? roundedValue < 0 : roundedValue > 0;
  const isNeutral = Math.abs(roundedValue) < 1;
  
  if (isNeutral) {
    return <span className="w-6 inline-block text-center text-[10px] text-gray-400 bg-gray-50 rounded px-1 py-0.5 ml-1">—</span>;
  }
  
  return (
    <span 
      className={`w-6 inline-block text-center text-[10px] rounded px-1 py-0.5 ml-1 ${
        isPositive 
          ? 'text-emerald-600 bg-emerald-50' 
          : 'text-rose-600 bg-rose-50'
      }`}
      title={`${roundedValue >= 0 ? '+' : ''}${roundedValue.toFixed(1)}%`}
    >
      {isPositive ? '↗' : '↘'}
    </span>
  );
};

// Difference cell component - clean, sophisticated design
const DifferenceCell: React.FC<{
  current: number;
  previous: number | undefined;
  format: 'number' | 'currency' | 'percentage' | 'decimal';
  inverted?: boolean;
}> = ({ current, previous, format, inverted = false }) => {
  if (previous === undefined) return <span className="text-gray-300">—</span>;
  
  const diff = current - previous;
  const percentChange = previous !== 0 ? ((current - previous) / previous) * 100 : (current > 0 ? 100 : 0);
  
  const isPositive = inverted ? diff < 0 : diff > 0;
  const isNegative = inverted ? diff > 0 : diff < 0;
  const isNeutral = Math.abs(percentChange) < 1;
  
  // Format percentage only - cleaner
  const formattedPercent = `${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(1)}%`;
  
  if (isNeutral) {
    return <span className="text-gray-400 font-normal">{formattedPercent}</span>;
  }
  
  // Subtle background tint instead of bold colors
  const bgClass = isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700';
  
  return (
    <span className={`${bgClass} px-1.5 py-0.5 rounded font-medium`}>
      {formattedPercent}
    </span>
  );
};

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
  // Track expanded rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRowExpansion = (accountId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  };

  // Calculate totals for table footer
  const calculatedTotals = useMemo(() => {
    if (!data?.accounts) return null;
    
    const filteredAccounts = data.accounts.filter(account => {
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && (account.metrics.impressions > 0 || account.metrics.clicks > 0));
      const matchesSearch = !searchTerm || account.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });

    const healthScores = filteredAccounts.map(account => {
      const healthScore = calculateAccountHealthScore(account);
      return { score: healthScore.overall, grade: healthScore.grade };
    });

    const avgHealthScore = healthScores.length > 0 
      ? Math.round(healthScores.reduce((sum, h) => sum + h.score, 0) / healthScores.length)
      : 0;

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

  // Pre-calculate health scores for all filtered accounts
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
        
        if (sortColumn.startsWith('metrics.')) {
          const metricKey = sortColumn.replace('metrics.', '') as keyof AccountMetrics['metrics'];
          aValue = a.metrics[metricKey];
          bValue = b.metrics[metricKey];
        } else if (sortColumn === 'healthScore') {
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

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="w-8 pl-4 pr-2 py-3"></th>
            <th 
              className="w-[220px] px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('name')}
            >
              Account {sortColumn === 'name' && <span className="text-teal-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
            </th>
            <th className="w-14 px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => onSort('healthScore')}>
              <Award className="w-3.5 h-3.5 mx-auto text-gray-400" />
            </th>
            <th className="w-px border-r border-gray-200"></th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => onSort('metrics.clicks')}>
              <div className="flex items-center justify-end">
                <span>Clicks {sortColumn === 'metrics.clicks' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
                <span className="w-6"></span>
              </div>
            </th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => onSort('metrics.impressions')}>
              <div className="flex items-center justify-end">
                <span>Impr. {sortColumn === 'metrics.impressions' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
                <span className="w-6"></span>
              </div>
            </th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => onSort('metrics.ctr')}>
              <div className="flex items-center justify-end">
                <span>CTR {sortColumn === 'metrics.ctr' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
                <span className="w-6"></span>
              </div>
            </th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => onSort('metrics.avgCpc')}>
              <div className="flex items-center justify-end">
                <span>CPC {sortColumn === 'metrics.avgCpc' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
                <span className="w-6"></span>
              </div>
            </th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => onSort('metrics.cost')}>
              <div className="flex items-center justify-end">
                <span>Cost {sortColumn === 'metrics.cost' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
                <span className="w-6"></span>
              </div>
            </th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => onSort('metrics.conversions')}>
              <div className="flex items-center justify-end">
                <span>Conv. {sortColumn === 'metrics.conversions' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
                <span className="w-6"></span>
              </div>
            </th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => onSort('metrics.cpa')}>
              <div className="flex items-center justify-end">
                <span>CPA {sortColumn === 'metrics.cpa' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
                <span className="w-6"></span>
              </div>
            </th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => onSort('metrics.conversionsValue')}>
              <div className="flex items-center justify-end">
                <span>Value {sortColumn === 'metrics.conversionsValue' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
                <span className="w-6"></span>
              </div>
            </th>
            <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => onSort('metrics.roas')}>
              <div className="flex items-center justify-end">
                <span>ROAS {sortColumn === 'metrics.roas' && (sortDirection === 'asc' ? '↑' : '↓')}</span>
                <span className="w-6"></span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {accountsWithHealthScores.map((account) => {
            const isExpanded = expandedRows.has(account.id);
            const hasPreviousData = !!account.previousMetrics;
            
            return (
              <React.Fragment key={account.id}>
                {/* Main row */}
                <tr 
                  className={`hover:bg-gray-50 cursor-pointer transition-colors ${isExpanded ? 'bg-slate-50' : ''}`}
                  onClick={() => hasPreviousData && toggleRowExpansion(account.id)}
                >
                  <td className="pl-4 pr-2 py-3">
                    {hasPreviousData ? (
                      isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-300" />
                    ) : null}
                </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 truncate" title={account.name}>{account.name}</div>
                    {account.topCampaign && (
                      <div className="text-[11px] text-gray-400 truncate mt-0.5" title={account.topCampaign}>
                        {account.topCampaign}
                      </div>
                    )}
              </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded font-medium ${account.healthStyles.bgColor} ${account.healthStyles.textColor}`}>
                      {account.healthGrade}
                    </span>
              </td>
                  <td className="border-r border-gray-200"></td>
                  <td className="px-4 py-3 text-gray-900">
                    <div className="flex items-center justify-end">
                      <span className="tabular-nums">{formatNumber(account.metrics.clicks)}</span>
                      <TrendIndicator value={account.trends?.clicks} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    <div className="flex items-center justify-end">
                      <span className="tabular-nums">{formatNumber(account.metrics.impressions)}</span>
                      <TrendIndicator value={account.trends?.impressions} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    <div className="flex items-center justify-end">
                      <span className="tabular-nums">{formatPercentage(account.metrics.ctr)}</span>
                      <TrendIndicator value={account.trends?.ctr} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    <div className="flex items-center justify-end">
                      <span className="tabular-nums">{formatCurrency(account.metrics.avgCpc)}</span>
                      <TrendIndicator value={account.trends?.avgCpc} inverted />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    <div className="flex items-center justify-end">
                      <span className="tabular-nums">{formatCurrency(account.metrics.cost)}</span>
                      <TrendIndicator value={account.trends?.cost} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    <div className="flex items-center justify-end">
                      <span className="tabular-nums">{formatNumber(account.metrics.conversions)}</span>
                      <TrendIndicator value={account.trends?.conversions} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    <div className="flex items-center justify-end">
                      <span className="tabular-nums">{formatCurrency(account.metrics.cpa)}</span>
                      <TrendIndicator value={account.trends?.cpa} inverted />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    <div className="flex items-center justify-end">
                      <span className="tabular-nums">{formatCurrency(account.metrics.conversionsValue)}</span>
                      <TrendIndicator value={account.trends?.conversionsValue} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    <div className="flex items-center justify-end">
                      <span className="tabular-nums">{account.metrics.roas.toFixed(2)}</span>
                      <TrendIndicator value={account.trends?.roas} />
                    </div>
                  </td>
                </tr>

                {/* Expanded rows: Previous period + Difference */}
                {isExpanded && account.previousMetrics && (
                  <>
                    {/* Previous period row */}
                    <tr className="bg-slate-50">
                      <td className="pl-4 pr-2 py-2"></td>
                      <td className="px-4 py-2 text-xs text-gray-400 italic">Previous period</td>
                      <td className="px-3 py-2"></td>
                      <td className="border-r border-gray-200"></td>
                      <td className="px-4 py-2 text-xs text-gray-500">
                        <div className="flex items-center justify-end">
                          <span className="tabular-nums">{formatNumber(account.previousMetrics.clicks)}</span>
                          <span className="w-6"></span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-500">
                        <div className="flex items-center justify-end">
                          <span className="tabular-nums">{formatNumber(account.previousMetrics.impressions)}</span>
                          <span className="w-6"></span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-500">
                        <div className="flex items-center justify-end">
                          <span className="tabular-nums">{formatPercentage(account.previousMetrics.ctr)}</span>
                          <span className="w-6"></span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-500">
                        <div className="flex items-center justify-end">
                          <span className="tabular-nums">{formatCurrency(account.previousMetrics.avgCpc)}</span>
                          <span className="w-6"></span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-500">
                        <div className="flex items-center justify-end">
                          <span className="tabular-nums">{formatCurrency(account.previousMetrics.cost)}</span>
                          <span className="w-6"></span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-500">
                        <div className="flex items-center justify-end">
                          <span className="tabular-nums">{formatNumber(account.previousMetrics.conversions)}</span>
                          <span className="w-6"></span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-500">
                        <div className="flex items-center justify-end">
                          <span className="tabular-nums">{formatCurrency(account.previousMetrics.cpa)}</span>
                          <span className="w-6"></span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-500">
                        <div className="flex items-center justify-end">
                          <span className="tabular-nums">{formatCurrency(account.previousMetrics.conversionsValue)}</span>
                          <span className="w-6"></span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-500">
                        <div className="flex items-center justify-end">
                          <span className="tabular-nums">{account.previousMetrics.roas.toFixed(2)}</span>
                          <span className="w-6"></span>
                        </div>
                      </td>
                    </tr>
                    {/* Change row */}
                    <tr className="bg-slate-100 border-b border-slate-200">
                      <td className="pl-4 pr-2 py-2"></td>
                      <td className="px-4 py-2 text-xs text-gray-500 font-medium">Change</td>
                      <td className="px-3 py-2"></td>
                      <td className="border-r border-gray-200"></td>
                      <td className="px-4 py-2 text-xs">
                        <div className="flex items-center justify-end">
                          <DifferenceCell current={account.metrics.clicks} previous={account.previousMetrics.clicks} format="number" />
                          <span className="w-6"></span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-xs">
                        <div className="flex items-center justify-end">
                          <DifferenceCell current={account.metrics.impressions} previous={account.previousMetrics.impressions} format="number" />
                          <span className="w-6"></span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-xs">
                        <div className="flex items-center justify-end">
                          <DifferenceCell current={account.metrics.ctr} previous={account.previousMetrics.ctr} format="percentage" />
                          <span className="w-6"></span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-xs">
                        <div className="flex items-center justify-end">
                          <DifferenceCell current={account.metrics.avgCpc} previous={account.previousMetrics.avgCpc} format="currency" inverted />
                          <span className="w-6"></span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-xs">
                        <div className="flex items-center justify-end">
                          <DifferenceCell current={account.metrics.cost} previous={account.previousMetrics.cost} format="currency" />
                          <span className="w-6"></span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-xs">
                        <div className="flex items-center justify-end">
                          <DifferenceCell current={account.metrics.conversions} previous={account.previousMetrics.conversions} format="number" />
                          <span className="w-6"></span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-xs">
                        <div className="flex items-center justify-end">
                          <DifferenceCell current={account.metrics.cpa} previous={account.previousMetrics.cpa} format="currency" inverted />
                          <span className="w-6"></span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-xs">
                        <div className="flex items-center justify-end">
                          <DifferenceCell current={account.metrics.conversionsValue} previous={account.previousMetrics.conversionsValue} format="currency" />
                          <span className="w-6"></span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-xs">
                        <div className="flex items-center justify-end">
                          <DifferenceCell current={account.metrics.roas} previous={account.previousMetrics.roas} format="decimal" />
                          <span className="w-6"></span>
                        </div>
                      </td>
                    </tr>
                  </>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
        {calculatedTotals && (
          <TableTotalsRow 
            totals={calculatedTotals}
            itemCount={accountsWithHealthScores.length}
            itemType="accounts"
            showCheckboxColumn={false}
          />
        )}
      </table>
    </div>
  );
};

export default AccountTable; 
