'use client';

import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Copy, Check, BarChart3, FileText, Eye, TrendingUp, Pin, Award, Loader2, Trophy, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { formatNumber, formatPercentage, formatCurrency } from '../../utils';

export interface AdItem {
  id: string;
  name: string;
  type: string;
  status: string;
  adStrength: string;
  headlines: string[];
  descriptions: string[];
  finalUrl: string;
  displayPath: string;
  impressions: number;
  clicks: number;
  cost: number;
  ctr: number;
  avgCpc: number;
  conversions: number;
  conversionsValue: number;
  cpa: number;
  roas: number;
}

interface AssetPerformance {
  id: string;
  text: string;
  fieldType: string;
  performanceLabel: string;
  pinnedField: string | null;
  enabled: boolean;
  impressions: number;
  clicks: number;
  conversions: number;
  cost: number;
  ctr: number;
  impressionShare?: number;
}

interface AssetPerformanceData {
  headlines: AssetPerformance[];
  descriptions: AssetPerformance[];
  summary: {
    totalHeadlines: number;
    totalDescriptions: number;
    headlineTotalImpressions: number;
    descriptionTotalImpressions: number;
    bestHeadline: string | null;
    bestDescription: string | null;
  };
}

interface AdPreviewModalProps {
  ad: AdItem | null;
  isOpen: boolean;
  onClose: () => void;
  accountId?: string;
  dateRange?: number;
}

type TabType = 'preview' | 'assets' | 'performance';

// Extract domain from URL for display
const getDomainFromUrl = (url: string): string => {
  try {
    const domain = new URL(url).hostname;
    return domain.replace('www.', '');
  } catch {
    return url;
  }
};

// Get ad strength config
const getAdStrengthConfig = (strength: string) => {
  const config: { [key: string]: { color: string; bgColor: string; width: string; label: string } } = {
    'EXCELLENT': { color: 'text-green-600', bgColor: 'bg-green-500', width: 'w-full', label: 'Excellent' },
    'GOOD': { color: 'text-blue-600', bgColor: 'bg-blue-500', width: 'w-3/4', label: 'Good' },
    'AVERAGE': { color: 'text-yellow-600', bgColor: 'bg-yellow-500', width: 'w-1/2', label: 'Average' },
    'POOR': { color: 'text-red-600', bgColor: 'bg-red-500', width: 'w-1/4', label: 'Poor' },
    'PENDING': { color: 'text-gray-500', bgColor: 'bg-gray-400', width: 'w-1/4', label: 'Pending' },
  };
  return config[strength] || config['PENDING'];
};

// Performance label badge component with icons
const PerformanceBadge: React.FC<{ label: string }> = ({ label }) => {
  const getIcon = () => {
    switch (label) {
      case 'BEST': return <Trophy className="h-3 w-3" />;
      case 'GOOD': return <CheckCircle className="h-3 w-3" />;
      case 'LOW': return <AlertTriangle className="h-3 w-3" />;
      case 'LEARNING': return <BarChart3 className="h-3 w-3" />;
      case 'PENDING': return <Clock className="h-3 w-3" />;
      default: return <BarChart3 className="h-3 w-3" />;
    }
  };

  const getStyles = () => {
    switch (label) {
      case 'BEST': return 'bg-green-50 text-green-700 border-green-200';
      case 'GOOD': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'LOW': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'LEARNING': return 'bg-gray-50 text-gray-600 border-gray-200';
      case 'PENDING': return 'bg-gray-50 text-gray-500 border-gray-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const getLabel = () => {
    if (label === 'LEARNING') return 'Learning';
    return label.charAt(0) + label.slice(1).toLowerCase();
  };
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${getStyles()}`}>
      {getIcon()}
      <span>{getLabel()}</span>
    </span>
  );
};

// Performance dot indicator
const PerformanceDot: React.FC<{ type: 'high' | 'medium' | 'low' }> = ({ type }) => {
  const colors = {
    high: 'bg-green-500',
    medium: 'bg-yellow-500',
    low: 'bg-red-500'
  };
  return <span className={`w-2 h-2 rounded-full ${colors[type]} flex-shrink-0`} />;
};

// Metric card for performance tab
interface MetricCardProps {
  label: string;
  value: string;
  subtext?: string;
  performance?: 'high' | 'medium' | 'low';
  large?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, subtext, performance, large }) => (
  <div className={`bg-white border border-gray-100 rounded-xl p-4 ${large ? 'col-span-2' : ''}`}>
    <div className="flex items-center justify-between mb-1">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      {performance && <PerformanceDot type={performance} />}
    </div>
    <p className={`font-semibold text-gray-900 ${large ? 'text-2xl' : 'text-xl'}`}>{value}</p>
    {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
  </div>
);

// Enhanced asset item with performance data
interface AssetItemProps {
  text: string;
  maxLength: number;
  index: number;
  performance?: AssetPerformance;
  hasPerformanceData: boolean;
}

const AssetItem: React.FC<AssetItemProps> = ({ text, maxLength, index, performance, hasPerformanceData }) => {
  const [copied, setCopied] = useState(false);
  const charCount = text.length;
  const isNearLimit = charCount >= maxLength * 0.9;
  
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group bg-gray-50 hover:bg-gray-100 rounded-xl p-4 transition-colors">
      {/* Main content row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <span className="text-xs font-bold text-gray-400 bg-gray-200 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5">
            {index + 1}
          </span>
          <p className="text-sm text-gray-800 flex-1 leading-relaxed">{text}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs font-mono ${isNearLimit ? 'text-orange-500' : 'text-gray-400'}`}>
            {charCount}/{maxLength}
          </span>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg hover:bg-white transition-colors opacity-0 group-hover:opacity-100"
            title="Copy"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-gray-400" />
            )}
          </button>
        </div>
      </div>
      
      {/* Performance data row */}
      {hasPerformanceData && performance && (
        <div className="mt-3 pt-3 border-t border-gray-200 flex items-center gap-3 flex-wrap">
          <PerformanceBadge label={performance.performanceLabel} />
          
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <TrendingUp className="h-3 w-3" />
            <span>{formatNumber(performance.impressions)} impr</span>
            {performance.impressionShare !== undefined && performance.impressionShare > 0 && (
              <span className="text-gray-400">({performance.impressionShare.toFixed(1)}%)</span>
            )}
          </div>
          
          {performance.clicks > 0 && (
            <div className="text-xs text-gray-500">
              {formatNumber(performance.clicks)} clicks
            </div>
          )}
          
          {performance.pinnedField && (
            <div className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
              <Pin className="h-3 w-3" />
              <span>{performance.pinnedField.replace('_', ' ')}</span>
            </div>
          )}
        </div>
      )}
      
      {/* Fallback when no performance data */}
      {hasPerformanceData && !performance && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <span className="text-xs text-gray-400 italic">Performance data not available</span>
        </div>
      )}
    </div>
  );
};

const AdPreviewModal: React.FC<AdPreviewModalProps> = ({ ad, isOpen, onClose, accountId, dateRange = 30 }) => {
  const [activeTab, setActiveTab] = useState<TabType>('preview');
  const [assetPerformance, setAssetPerformance] = useState<AssetPerformanceData | null>(null);
  const [assetLoading, setAssetLoading] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);

  // Fetch asset performance data when modal opens or ad changes
  useEffect(() => {
    if (!isOpen || !ad || !accountId) {
      setAssetPerformance(null);
      return;
    }

    const fetchAssetPerformance = async () => {
      setAssetLoading(true);
      setAssetError(null);
      
      try {
        const response = await fetch(
          `/api/asset-performance?customerId=${accountId}&adId=${ad.id}&dateRange=${dateRange}`
        );
        const result = await response.json();
        
        if (result.success && result.data) {
          setAssetPerformance(result.data);
        } else {
          setAssetError(result.data?.error || 'Failed to load asset performance');
        }
      } catch (err) {
        console.error('Error fetching asset performance:', err);
        setAssetError('Failed to load asset performance data');
      } finally {
        setAssetLoading(false);
      }
    };

    fetchAssetPerformance();
  }, [isOpen, ad?.id, accountId, dateRange]);

  if (!isOpen || !ad) return null;

  const domain = getDomainFromUrl(ad.finalUrl);
  const strengthConfig = getAdStrengthConfig(ad.adStrength);

  // Display headlines/descriptions for preview
  const displayHeadlines = ad.headlines.slice(0, 3);
  const displayDescriptions = ad.descriptions.slice(0, 2);

  // Performance indicators
  const getCtrPerformance = () => ad.ctr >= 5 ? 'high' : ad.ctr >= 2 ? 'medium' : 'low';
  const getRoasPerformance = () => ad.roas >= 3 ? 'high' : ad.roas >= 1 ? 'medium' : 'low';
  const getCpaPerformance = () => ad.cpa <= 20 ? 'high' : ad.cpa <= 50 ? 'medium' : 'low';

  // Match headline/description text to performance data
  const getHeadlinePerformance = (text: string): AssetPerformance | undefined => {
    return assetPerformance?.headlines.find(h => h.text === text);
  };
  
  const getDescriptionPerformance = (text: string): AssetPerformance | undefined => {
    return assetPerformance?.descriptions.find(d => d.text === text);
  };

  const hasPerformanceData = assetPerformance !== null && 
    (assetPerformance.headlines.length > 0 || assetPerformance.descriptions.length > 0);

  const tabs = [
    { id: 'preview' as TabType, label: 'Preview', icon: Eye },
    { id: 'assets' as TabType, label: 'Assets', icon: FileText },
    { id: 'performance' as TabType, label: 'Performance', icon: BarChart3 },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-gray-50 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
          {/* Header */}
          <div className="bg-white border-b border-gray-100">
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Ad Preview</h2>
                <p className="text-sm text-gray-500">Responsive Search Ad</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            
            {/* Tabs */}
            <div className="flex px-6 space-x-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-gray-50 text-gray-900 border-t border-x border-gray-200'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                  {tab.id === 'assets' && hasPerformanceData && (
                    <span className="ml-1 w-2 h-2 bg-green-500 rounded-full" title="Performance data available" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {/* ============ PREVIEW TAB ============ */}
            {activeTab === 'preview' && (
              <div className="space-y-6">
                {/* Google Ad Preview - Enhanced */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <div className="space-y-3">
                    {/* Sponsored label */}
                    <span className="inline-block text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                      Sponsored
                    </span>
                    
                    {/* Display URL with favicon */}
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">{domain.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="flex items-center text-sm">
                        <span className="text-gray-800">{domain}</span>
                        {ad.displayPath && (
                          <>
                            <span className="text-gray-400 mx-1">›</span>
                            <span className="text-gray-600">{ad.displayPath.replace(/\//g, ' › ')}</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Headlines */}
                    <h3 className="text-xl text-blue-700 hover:underline cursor-pointer leading-snug font-normal">
                      {displayHeadlines.join(' | ')}
                    </h3>
                    
                    {/* Descriptions */}
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {displayDescriptions.join(' ')}
                    </p>
                  </div>
                </div>

                {/* Ad Strength - Enhanced */}
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">Ad Strength</span>
                    <span className={`text-sm font-semibold ${strengthConfig.color}`}>
                      {strengthConfig.label}
                    </span>
                  </div>
                  <div className="relative">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${strengthConfig.bgColor} ${strengthConfig.width} rounded-full transition-all duration-700`} />
                    </div>
                    {/* Strength markers */}
                    <div className="flex justify-between mt-1.5 text-[10px] text-gray-400">
                      <span>Poor</span>
                      <span>Average</span>
                      <span>Good</span>
                      <span>Excellent</span>
                    </div>
                  </div>
                </div>

                {/* Key Metrics - Just 4 */}
                <div className="grid grid-cols-4 gap-3">
                  <MetricCard label="Clicks" value={formatNumber(ad.clicks)} />
                  <MetricCard label="CTR" value={formatPercentage(ad.ctr)} performance={getCtrPerformance()} />
                  <MetricCard label="Cost" value={formatCurrency(ad.cost)} />
                  <MetricCard label="ROAS" value={`${ad.roas.toFixed(2)}x`} performance={getRoasPerformance()} />
                </div>
              </div>
            )}

            {/* ============ ASSETS TAB ============ */}
            {activeTab === 'assets' && (
              <div className="space-y-6">
                {/* Performance data loading state */}
                {assetLoading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                    <span className="ml-2 text-sm text-gray-500">Loading asset performance...</span>
                  </div>
                )}

                {/* Summary banner if we have performance data */}
                {hasPerformanceData && assetPerformance?.summary && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-semibold text-blue-900">Performance Insights</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {assetPerformance.summary.bestHeadline && (
                        <div>
                          <span className="text-blue-600">Best headline:</span>
                          <p className="text-blue-900 font-medium truncate">{assetPerformance.summary.bestHeadline}</p>
                        </div>
                      )}
                      {assetPerformance.summary.bestDescription && (
                        <div>
                          <span className="text-blue-600">Best description:</span>
                          <p className="text-blue-900 font-medium truncate">{assetPerformance.summary.bestDescription}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Headlines */}
                <div className="bg-white rounded-xl p-5 border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-gray-900">Headlines</h4>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      {ad.headlines.length} assets
                    </span>
                  </div>
                  <div className="space-y-3">
                    {ad.headlines.map((headline, idx) => (
                      <AssetItem 
                        key={idx} 
                        text={headline} 
                        maxLength={30} 
                        index={idx}
                        performance={getHeadlinePerformance(headline)}
                        hasPerformanceData={hasPerformanceData && !assetLoading}
                      />
                    ))}
                  </div>
                </div>

                {/* Descriptions */}
                <div className="bg-white rounded-xl p-5 border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-gray-900">Descriptions</h4>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      {ad.descriptions.length} assets
                    </span>
                  </div>
                  <div className="space-y-3">
                    {ad.descriptions.map((desc, idx) => (
                      <AssetItem 
                        key={idx} 
                        text={desc} 
                        maxLength={90} 
                        index={idx}
                        performance={getDescriptionPerformance(desc)}
                        hasPerformanceData={hasPerformanceData && !assetLoading}
                      />
                    ))}
                  </div>
                </div>

                {/* Error message */}
                {assetError && !assetLoading && (
                  <div className="text-center py-4 text-sm text-gray-500">
                    <p>{assetError}</p>
                    <p className="text-xs mt-1">Asset-level metrics may not be available for all ads.</p>
                  </div>
                )}
              </div>
            )}

            {/* ============ PERFORMANCE TAB ============ */}
            {activeTab === 'performance' && (
              <div className="space-y-4">
                {/* Primary Metrics */}
                <div className="grid grid-cols-3 gap-4">
                  <MetricCard 
                    label="Impressions" 
                    value={formatNumber(ad.impressions)} 
                    large 
                  />
                  <MetricCard 
                    label="Clicks" 
                    value={formatNumber(ad.clicks)}
                  />
                  <MetricCard 
                    label="CTR" 
                    value={formatPercentage(ad.ctr)}
                    performance={getCtrPerformance()}
                  />
                </div>

                {/* Cost Metrics */}
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Cost Analysis</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Total Spend</p>
                      <p className="text-2xl font-semibold text-gray-900">{formatCurrency(ad.cost)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Avg. CPC</p>
                      <p className="text-2xl font-semibold text-gray-900">{formatCurrency(ad.avgCpc)}</p>
                    </div>
                  </div>
                </div>

                {/* Conversion Metrics */}
                <div className="bg-white rounded-xl p-4 border border-gray-100">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Conversions</h4>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Conversions</p>
                      <p className="text-xl font-semibold text-gray-900">{formatNumber(ad.conversions)}</p>
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <p className="text-xs text-gray-500">CPA</p>
                        <PerformanceDot type={getCpaPerformance()} />
                      </div>
                      <p className="text-xl font-semibold text-gray-900">{formatCurrency(ad.cpa)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Conv. Value</p>
                      <p className="text-xl font-semibold text-gray-900">{formatCurrency(ad.conversionsValue)}</p>
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <p className="text-xs text-gray-500">ROAS</p>
                        <PerformanceDot type={getRoasPerformance()} />
                      </div>
                      <p className="text-xl font-semibold text-green-600">{ad.roas.toFixed(2)}x</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer - Always visible */}
          <div className="bg-white border-t border-gray-100 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                  ad.status === 'ENABLED' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {ad.status === 'ENABLED' ? 'Active' : 'Paused'}
                </span>
                <span className="text-xs text-gray-400">ID: {ad.id}</span>
              </div>
              {ad.finalUrl && (
                <a
                  href={ad.finalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  <span>View Landing Page</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdPreviewModal;
