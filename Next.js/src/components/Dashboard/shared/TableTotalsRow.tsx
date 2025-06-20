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
    <tr className="font-medium">
      {showCheckboxColumn && (
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"></td>
      )}
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        <div className="flex items-center">
          <Calculator className="h-4 w-4 text-gray-500 mr-2" />
          Totals ({totals.campaignCount || totals.adGroupCount || totals.productCount || totals.accountCount || itemCount} {itemType})
        </div>
      </td>
      {itemType === 'campaigns' && (
        <td className="px-1 py-4 w-px border-r border-gray-300"></td>
      )}
      {itemType === 'ad groups' && (
        <>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"></td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"></td>
        </>
      )}
      {itemType === 'products' && (
        <>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"></td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"></td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"></td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"></td>
        </>
      )}
      {itemType === 'accounts' && (
        <>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatNumber(totals.accountCount || itemCount)}</td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatNumber(totals.campaignCount || 0)}</td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
            {totals.avgHealthScore !== undefined && (
              <div className="flex items-center space-x-1">
                <span className="font-medium">{totals.avgHealthScore}</span>
                {totals.avgHealthGrade && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-700 border border-gray-300">
                    {totals.avgHealthGrade}
                  </span>
                )}
              </div>
            )}
          </td>
          <td className="px-1 py-4 w-px border-r border-gray-300"></td>
        </>
      )}
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {formatNumber(totals.clicks)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {formatNumber(totals.impressions)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {formatPercentage(totals.ctr)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {formatCurrency(totals.avgCpc)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {formatCurrency(totals.cost)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {formatNumber(totals.conversions)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {formatCurrency(totals.cpa)}
      </td>
      {itemType === 'products' && totals.poas !== undefined && (
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {totals.poas.toFixed(2)}
        </td>
      )}
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {formatCurrency(totals.conversionsValue)}
      </td>
      {itemType !== 'products' && (
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {totals.roas.toFixed(2)}
        </td>
      )}
      {showExtraColumns && (
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"></td>
      )}
    </tr>
  </tfoot>
); 