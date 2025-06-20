import React from 'react';
import AccountTable from './AccountTable';
import { AccountMetrics, MccOverviewData } from '@/types/mcc';

interface MemoizedAccountTableProps {
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

const MemoizedAccountTable = React.memo<MemoizedAccountTableProps>((props) => {
  return <AccountTable {...props} />;
}, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.data === nextProps.data &&
    prevProps.loading === nextProps.loading &&
    prevProps.searchTerm === nextProps.searchTerm &&
    prevProps.pageSize === nextProps.pageSize &&
    prevProps.sortColumn === nextProps.sortColumn &&
    prevProps.sortDirection === nextProps.sortDirection &&
    prevProps.statusFilter === nextProps.statusFilter &&
    prevProps.selectedAccounts?.length === nextProps.selectedAccounts?.length &&
    (prevProps.selectedAccounts?.every((id, index) => id === nextProps.selectedAccounts?.[index]) ?? true)
  );
});

MemoizedAccountTable.displayName = 'MemoizedAccountTable';

export default MemoizedAccountTable; 