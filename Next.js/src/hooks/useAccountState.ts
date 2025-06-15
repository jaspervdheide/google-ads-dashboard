import { useState, useEffect } from 'react';
import { Account } from '../types';

type AccountWithClicks = Account & { totalClicks: number };

export function useAccountState() {
  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<AccountWithClicks[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Data fetching functions
  const fetchAccountClicks = async (accountId: string): Promise<number> => {
    console.log("🔄 FETCHING ACCOUNT CLICKS DATA");
    try {
      const response = await fetch(`/api/campaigns?customerId=${accountId}&dateRange=30`);
      const result = await response.json();
      if (result.success && result.data?.totals) {
        return result.data.totals.clicks || 0;
      }
      return 0;
    } catch (err) {
      console.error(`Error fetching clicks for account ${accountId}:`, err);
      return 0;
    }
  };

  const filterActiveAccounts = async (accounts: Account[]): Promise<AccountWithClicks[]> => {
    const accountsWithClicks = await Promise.all(
      accounts.map(async (account): Promise<AccountWithClicks> => {
        const clicks = await fetchAccountClicks(account.id);
        return { ...account, totalClicks: clicks };
      })
    );

    const activeAccounts = accountsWithClicks.filter(account => account.totalClicks > 0);
    return activeAccounts;
  };

  const fetchAccounts = async () => {
    console.log("🔄 FETCHING ACCOUNTS DATA");
    try {
      setLoading(true);
      const response = await fetch('/api/accounts');
      const result = await response.json();
      
      if (result.success && result.data) {
        setAllAccounts(result.data);
        
        const activeAccounts = await filterActiveAccounts(result.data);
        setFilteredAccounts(activeAccounts);
        
        if (activeAccounts.length > 0) {
          setSelectedAccount(activeAccounts[0].id);
        }
      } else {
        setError(result.message || 'Failed to fetch accounts');
      }
    } catch (err) {
      setError('Error fetching accounts');
      console.error('Error fetching accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  // Account selection handler
  const handleAccountSelect = (accountId: string) => {
    setSelectedAccount(accountId);
  };

  // Effects
  useEffect(() => {
    fetchAccounts();
  }, []);

  return {
    // State
    allAccounts,
    filteredAccounts,
    selectedAccount,
    loading,
    error,
    
    // Actions
    handleAccountSelect,
    setError,
    
    // Computed
    selectedAccountData: filteredAccounts.find(acc => acc.id === selectedAccount) || null
  };
} 