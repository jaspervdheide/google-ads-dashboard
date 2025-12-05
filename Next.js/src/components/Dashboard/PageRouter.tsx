import React from 'react';
import DashboardView from './DashboardView';
import SettingsView from './SettingsView';
import MccOverviewView from './MccOverviewView';
import ProductsView from './ProductsView';
import KeywordsView from './KeywordsView';
import AuctionsView from './AuctionsView';

interface PageRouterProps {
  currentPage: string;
  dashboardProps: any;
  settingsProps: any;
  mccOverviewProps: any;
  productsProps: any;
  keywordsProps: any;
  auctionsProps: any;
}

export default function PageRouter({
  currentPage,
  dashboardProps,
  settingsProps,
  mccOverviewProps,
  productsProps,
  keywordsProps,
  auctionsProps
}: PageRouterProps) {
  switch (currentPage) {
    case 'dashboard':
      return <DashboardView {...dashboardProps} />;
    
    case 'products':
      return <ProductsView {...productsProps} />;
    
    case 'keywords':
      return <KeywordsView {...keywordsProps} />;
    
    case 'auctions':
      return <AuctionsView {...auctionsProps} />;
    
    case 'settings':
      return <SettingsView {...settingsProps} />;
    
    case 'mcc-overview':
      return <MccOverviewView {...mccOverviewProps} />;
    
    default:
      return <DashboardView {...dashboardProps} />;
  }
}
