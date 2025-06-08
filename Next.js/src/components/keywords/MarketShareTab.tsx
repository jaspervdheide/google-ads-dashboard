import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts';

interface MonthlyData {
  month: string;
  searchVolume: number;
  clicks: number;
  cost: number;
  formattedMonth: string;
  competitionLevel: string;
  marketShareCaptured: number;
  avgImpressionShare: number;
}

interface MarketShareData {
  monthlyData: MonthlyData[];
  summary: {
    totalKeywords: number;
    totalSearchVolume: number;
    totalClicks: number;
    totalCost: number;
    marketCaptureRate: number;
    avgImpressionShare: number;
    totalMissedOpportunity: number;
  };
  dateRange: {
    days: number;
    monthsAnalyzed: number;
  };
}

interface MarketShareTabProps {
  customerId: string;
}

const MarketShareTab: React.FC<MarketShareTabProps> = ({ customerId }) => {
  const [data, setData] = useState<MarketShareData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState(90);

  const fetchMarketShareData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/keyword-planning/historical-metrics?customerId=${customerId}&dateRange=${dateRange}`);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        console.error('Failed to fetch market share data:', result.message);
      }
    } catch (error) {
      console.error('Error fetching market share data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customerId) {
      fetchMarketShareData();
    }
  }, [customerId, dateRange]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading market share analysis...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-500">No market share data available</div>
      </div>
    );
  }

  const chartData = data.monthlyData.map(item => ({
    month: item.formattedMonth,
    searchVolume: item.searchVolume,
    clicks: item.clicks,
    marketShare: item.marketShareCaptured,
    impressionShare: item.avgImpressionShare
  }));

  return (
    <div className="market-share-tab space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Market Share Analysis</h2>
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Time Range:</label>
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 3 months</option>
            <option value={180}>Last 6 months</option>
            <option value={365}>Last 12 months</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Market Capture Rate</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {data.summary.marketCaptureRate.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-400 mt-1">Clicks vs Search Volume</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Keywords</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {data.summary.totalKeywords.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 mt-1">Active keywords analyzed</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Search Volume</h3>
          <p className="text-3xl font-bold text-purple-600 mt-2">
            {data.summary.totalSearchVolume.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 mt-1">Estimated monthly searches</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Clicks</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {data.summary.totalClicks.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400 mt-1">Actual clicks received</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Monthly Search Volume vs Clicks</h3>
          <div className="text-sm text-gray-500">
            {data.dateRange.monthsAnalyzed} months analyzed
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="month" 
              stroke="#666"
              fontSize={12}
            />
            <YAxis stroke="#666" fontSize={12} />
            <Tooltip 
              formatter={(value: number, name: string) => [
                Number(value).toLocaleString(),
                name === 'searchVolume' ? 'Search Volume' : 'Clicks'
              ]}
              labelStyle={{ color: '#333' }}
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #ccc',
                borderRadius: '8px'
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="searchVolume" 
              stroke="#8b5cf6" 
              strokeWidth={3}
              name="Search Volume"
              dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="clicks" 
              stroke="#10b981" 
              strokeWidth={3}
              name="Clicks"
              dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Market Share Trend</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" stroke="#666" fontSize={12} />
            <YAxis stroke="#666" fontSize={12} />
            <Tooltip 
              formatter={(value: number) => [`${Number(value).toFixed(1)}%`, 'Market Share']}
              labelStyle={{ color: '#333' }}
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #ccc',
                borderRadius: '8px'
              }}
            />
            <Bar 
              dataKey="marketShare" 
              fill="#3b82f6"
              name="Market Share %"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Opportunity Analysis</h4>
            <p className="text-sm text-gray-600">
              You're capturing <strong>{data.summary.marketCaptureRate.toFixed(1)}%</strong> of available search traffic.
              {data.summary.marketCaptureRate < 10 && " There's significant room for improvement."}
              {data.summary.marketCaptureRate >= 10 && data.summary.marketCaptureRate < 25 && " Good foundation with growth opportunities."}
              {data.summary.marketCaptureRate >= 25 && " Strong market presence!"}
            </p>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Performance Summary</h4>
            <p className="text-sm text-gray-600">
              Across {data.summary.totalKeywords} keywords, you've generated{' '}
              <strong>{data.summary.totalClicks.toLocaleString()}</strong> clicks from{' '}
              <strong>{data.summary.totalSearchVolume.toLocaleString()}</strong> potential searches.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketShareTab; 