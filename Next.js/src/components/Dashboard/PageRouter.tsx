import React from 'react';
import DashboardView from './DashboardView';
import SettingsView from './SettingsView';
import MccOverviewView from './MccOverviewView';
import ProductsView from './ProductsView';

interface PageRouterProps {
  currentPage: string;
  dashboardProps: any;
  settingsProps: any;
  mccOverviewProps: any;
  productsProps: any;
}

export default function PageRouter({
  currentPage,
  dashboardProps,
  settingsProps,
  mccOverviewProps,
  productsProps
}: PageRouterProps) {
  switch (currentPage) {
    case 'dashboard':
      return <DashboardView {...dashboardProps} />;
    
    case 'products':
      return <ProductsView {...productsProps} />;
    
    case 'settings':
      return <SettingsView {...settingsProps} />;
    
    case 'mcc-overview':
      return <MccOverviewView {...mccOverviewProps} />;
    
    default:
      return <DashboardView {...dashboardProps} />;
  }
}
