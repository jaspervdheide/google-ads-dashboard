import { useState } from 'react';

export function useDropdownState() {
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [anomalyDropdownOpen, setAnomalyDropdownOpen] = useState(false);
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [customDateModalOpen, setCustomDateModalOpen] = useState(false);

  // Toggle handlers
  const toggleAccountDropdown = () => setAccountDropdownOpen(!accountDropdownOpen);
  const toggleAnomalyDropdown = () => setAnomalyDropdownOpen(!anomalyDropdownOpen);
  const toggleDateDropdown = () => setDateDropdownOpen(!dateDropdownOpen);
  const toggleCustomDateModal = () => setCustomDateModalOpen(true);

  // Close handlers
  const closeAccountDropdown = () => setAccountDropdownOpen(false);
  const closeAnomalyDropdown = () => setAnomalyDropdownOpen(false);
  const closeDateDropdown = () => setDateDropdownOpen(false);
  const closeCustomDateModal = () => setCustomDateModalOpen(false);

  // Combined handlers for common patterns
  const handleAccountSelect = (callback: (accountId: string) => void) => (accountId: string) => {
    callback(accountId);
    closeAccountDropdown();
  };

  const handleDateRangeSelect = (callback: (range: any) => void) => (range: any) => {
    callback(range);
    closeDateDropdown();
  };

  const handleAnomalyAccountSelect = (callback: (accountId: string) => void) => (accountId: string) => {
    callback(accountId);
    closeAnomalyDropdown();
  };

  return {
    // State
    accountDropdownOpen,
    anomalyDropdownOpen,
    dateDropdownOpen,
    customDateModalOpen,
    
    // Toggle handlers
    toggleAccountDropdown,
    toggleAnomalyDropdown,
    toggleDateDropdown,
    toggleCustomDateModal,
    
    // Close handlers
    closeAccountDropdown,
    closeAnomalyDropdown,
    closeDateDropdown,
    closeCustomDateModal,
    
    // Setters for direct control
    setAccountDropdownOpen,
    setAnomalyDropdownOpen,
    setDateDropdownOpen,
    setCustomDateModalOpen,
    
    // Combined handlers
    handleAccountSelect,
    handleDateRangeSelect,
    handleAnomalyAccountSelect
  };
} 