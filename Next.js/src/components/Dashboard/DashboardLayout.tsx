import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import CustomDateModal from './CustomDateModal';
import HoverMetricsChart from './HoverMetricsChart';

interface DashboardLayoutProps {
  children: React.ReactNode;
  headerProps: {
    selectedAccount: string;
    selectedAccountData: any;
    filteredAccounts: any[];
    selectedDateRange: any;
    dateRanges: any[];
    anomalyData: any;
    loading: boolean;
    anomalyLoading: boolean;
    accountDropdownOpen: boolean;
    dateDropdownOpen: boolean;
    anomalyDropdownOpen: boolean;
    customDateModalOpen: boolean;
    onAccountDropdownToggle: () => void;
    onDateDropdownToggle: () => void;
    onAnomalyDropdownToggle: () => void;
    onCustomDateModalToggle: () => void;
    onAccountSelect: (accountId: string) => void;
    onDateRangeSelect: (range: any) => void;
    onRefresh: () => void;
    onAnomalyAccountSelect: (accountId: string) => void;
    formatDateRangeDisplay: (range: any) => string;
    formatTimeAgo: (dateString: string) => string;
    formatNumber: (num: number) => string;
    cleanCountryCode: (code: string) => string;
    getDisplayName: (account: any) => string;
    getSeverityIcon: (severity: string) => any;
    getSeverityColor: (severity: string) => string;
  };
  sidebarProps: {
    currentPage: string;
    filteredAccounts: any[];
    onPageChange: (page: string) => void;
  };
  modalProps: {
    customDateModalOpen: boolean;
    customDateRange: any;
    onCustomDateModalClose: () => void;
    onCustomDateApply: () => void;
    onCustomDateChange: (range: any) => void;
  };
  hoverProps: {
    hoverChart: any;
    onChartHover: () => void;
    onChartLeave: () => void;
  };
  dropdownStates: {
    accountDropdownOpen: boolean;
    dateDropdownOpen: boolean;
    setAccountDropdownOpen: (open: boolean) => void;
    setDateDropdownOpen: (open: boolean) => void;
  };
}

export default function DashboardLayout({
  children,
  headerProps,
  sidebarProps,
  modalProps,
  hoverProps,
  dropdownStates
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Header {...headerProps} />
      
      <Sidebar {...sidebarProps} />

      <main className="ml-[240px] pt-16">
        <div className="p-8">
          {children}
        </div>
      </main>

      <CustomDateModal
        isOpen={modalProps.customDateModalOpen}
        customDateRange={modalProps.customDateRange}
        onClose={modalProps.onCustomDateModalClose}
        onApply={modalProps.onCustomDateApply}
        onDateChange={modalProps.onCustomDateChange}
      />

      <HoverMetricsChart
        isVisible={hoverProps.hoverChart.isVisible}
        position={hoverProps.hoverChart.position}
        metricType={hoverProps.hoverChart.metricType}
        metricValue={hoverProps.hoverChart.metricValue}
        campaignName={hoverProps.hoverChart.campaignName}
        campaignId={hoverProps.hoverChart.campaignId}
        onChartHover={hoverProps.onChartHover}
        onChartLeave={hoverProps.onChartLeave}
      />

      {dropdownStates.accountDropdownOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => dropdownStates.setAccountDropdownOpen(false)}
        />
      )}
      {dropdownStates.dateDropdownOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => dropdownStates.setDateDropdownOpen(false)}
        />
      )}
    </div>
  );
} 