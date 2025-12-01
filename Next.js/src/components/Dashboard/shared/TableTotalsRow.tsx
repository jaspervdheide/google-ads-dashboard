import React from 'react';
import { Calculator } from 'lucide-react';
import { formatNumber, formatPercentage, formatCurrency } from '../../../utils';

interface TableTotalsRowProps {
  totals: {
    clicks: number;
    impressions: number;
    cost: number;
    ctr: number;
    avgCpc: number;
    conversions: number;
    conversionsValue: number;
    cpa: number;
    roas: number;
    campaignCount?: number;
    adGroupCount?: number;
    productCount?: number;
    accountCount?: number;
    poas?: number; // Profit on Ad Spend for shopping products
    avgHealthScore?: number; // Average health score for accounts
    avgHealthGrade?: string; // Average health grade for accounts
  };
  itemCount: number;
  itemType: 'campaigns' | 'ad groups' | 'products' | 'accounts';
  showExtraColumns?: boolean;
  showCheckboxColumn?: boolean;
}

export const TableTotalsRow: React.FC<TableTotalsRowProps> = ({ 
  totals, 
  itemCount, 
  itemType,
  showExtraColumns = false,
  showCheckboxColumn = false 
}) => (
  <tfoot className="bg-gray-50 border-t-2 border-gray-200">
    <tr className="font-medium text-sm">
      {showCheckboxColumn && (
        <td className="px-4 py-3 whitespace-nowrap text-gray-900"></td>
      )}
      {itemType === 'accounts' && (
        <>
          {/* Expand icon column */}
          <td className="pl-4 pr-2 py-3"></td>
          {/* Account name column with totals label */}
          <td className="px-4 py-3">
            <div className="flex items-center">
              <Calculator className="h-4 w-4 text-gray-400 mr-2" />
              <span className="text-sm text-gray-600">Totals ({totals.accountCount || itemCount} accounts)</span>
            </div>
          </td>
          {/* Health grade */}
          <td className="px-3 py-3 text-center">
            {totals.avgHealthGrade && (
              <span className="text-xs px-2 py-1 rounded font-medium bg-gray-100 text-gray-600">
                {totals.avgHealthGrade}
              </span>
            )}
          </td>
          <td className="border-r border-gray-200"></td>
        </>
      )}
      {itemType === 'campaigns' && (
        <>
          <td className="px-2 py-2 whitespace-nowrap text-gray-900">
            <div className="flex items-center">
              <Calculator className="h-3.5 w-3.5 text-gray-500 mr-1.5" />
              <span className="text-xs">Totals ({totals.campaignCount || itemCount} {itemType})</span>
            </div>
          </td>
          <td className="w-px border-r border-gray-300"></td>
        </>
      )}
      {itemType === 'ad groups' && (
        <>
          <td className="px-2 py-2 whitespace-nowrap text-gray-900">
            <div className="flex items-center">
              <Calculator className="h-3.5 w-3.5 text-gray-500 mr-1.5" />
              <span className="text-xs">Totals ({totals.adGroupCount || itemCount} {itemType})</span>
            </div>
          </td>
          <td className="px-2 py-2 whitespace-nowrap text-gray-900"></td>
          <td className="px-2 py-2 whitespace-nowrap text-gray-900"></td>
        </>
      )}
      {itemType === 'products' && (
        <>
          <td className="px-2 py-2 whitespace-nowrap text-gray-900">
            <div className="flex items-center">
              <Calculator className="h-3.5 w-3.5 text-gray-500 mr-1.5" />
              <span className="text-xs">Totals ({totals.productCount || itemCount} {itemType})</span>
            </div>
          </td>
          <td className="px-2 py-2 whitespace-nowrap text-gray-900"></td>
          <td className="px-2 py-2 whitespace-nowrap text-gray-900"></td>
          <td className="px-2 py-2 whitespace-nowrap text-gray-900"></td>
          <td className="px-2 py-2 whitespace-nowrap text-gray-900"></td>
        </>
      )}
      <td className="px-4 py-3 whitespace-nowrap text-gray-700">
        <div className="flex items-center justify-end">
          <span className="tabular-nums">{formatNumber(totals.clicks)}</span>
          {itemType === 'accounts' && <span className="w-6"></span>}
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-gray-700">
        <div className="flex items-center justify-end">
          <span className="tabular-nums">{formatNumber(totals.impressions)}</span>
          {itemType === 'accounts' && <span className="w-6"></span>}
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-gray-700">
        <div className="flex items-center justify-end">
          <span className="tabular-nums">{formatPercentage(totals.ctr)}</span>
          {itemType === 'accounts' && <span className="w-6"></span>}
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-gray-700">
        <div className="flex items-center justify-end">
          <span className="tabular-nums">{formatCurrency(totals.avgCpc)}</span>
          {itemType === 'accounts' && <span className="w-6"></span>}
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-gray-700">
        <div className="flex items-center justify-end">
          <span className="tabular-nums">{formatCurrency(totals.cost)}</span>
          {itemType === 'accounts' && <span className="w-6"></span>}
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-gray-700">
        <div className="flex items-center justify-end">
          <span className="tabular-nums">{formatNumber(totals.conversions)}</span>
          {itemType === 'accounts' && <span className="w-6"></span>}
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-gray-700">
        <div className="flex items-center justify-end">
          <span className="tabular-nums">{formatCurrency(totals.cpa)}</span>
          {itemType === 'accounts' && <span className="w-6"></span>}
        </div>
      </td>
      {itemType === 'products' && totals.poas !== undefined && (
        <td className="px-4 py-3 whitespace-nowrap text-gray-700 text-right tabular-nums">
          {totals.poas.toFixed(2)}
        </td>
      )}
      <td className="px-4 py-3 whitespace-nowrap text-gray-700">
        <div className="flex items-center justify-end">
          <span className="tabular-nums">{formatCurrency(totals.conversionsValue)}</span>
          {itemType === 'accounts' && <span className="w-6"></span>}
        </div>
      </td>
      {itemType !== 'products' && (
        <td className="px-4 py-3 whitespace-nowrap text-gray-700">
          <div className="flex items-center justify-end">
            <span className="tabular-nums">{totals.roas.toFixed(2)}</span>
            {itemType === 'accounts' && <span className="w-6"></span>}
          </div>
        </td>
      )}
      {showExtraColumns && (
        <td className="px-4 py-3 whitespace-nowrap text-gray-700"></td>
      )}
    </tr>
  </tfoot>
); 