import { AccountMetrics } from '@/types/mcc';

export interface AccountHealthScore {
  overall: number;
  breakdown: {
    efficiency: number;
    volume: number;
    performance: number;
    quality: number;
  };
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F';
  status: 'excellent' | 'good' | 'fair' | 'needs-attention' | 'critical';
  insights: string[];
  recommendations: string[];
}

// Weight configuration for scoring components
const SCORING_WEIGHTS = {
  efficiency: 0.3,  // CPA, ROAS efficiency
  volume: 0.25,     // Impressions, clicks volume
  performance: 0.3, // Conversions, conversion rate
  quality: 0.15     // CTR, avg CPC quality
};

// Scoring thresholds based on your existing performance indicators
const THRESHOLDS = {
  roas: { excellent: 5.0, good: 3.5, fair: 2.0, poor: 1.0 },
  cpa: { excellent: 20, good: 40, fair: 80, poor: 150 },
  ctr: { excellent: 3.5, good: 2.5, fair: 1.5, poor: 0.8 },
  conversionRate: { excellent: 8.0, good: 5.0, fair: 2.5, poor: 1.0 },
  avgCpc: { excellent: 0.5, good: 1.0, fair: 2.0, poor: 4.0 },
  impressions: { excellent: 50000, good: 25000, fair: 10000, poor: 2500 },
  clicks: { excellent: 2000, good: 1000, fair: 400, poor: 100 },
  conversions: { excellent: 100, good: 50, fair: 20, poor: 5 }
};

/**
 * Calculate score for a metric based on thresholds (0-100)
 */
function calculateMetricScore(value: number, metric: keyof typeof THRESHOLDS, isHigherBetter: boolean = true): number {
  const thresholds = THRESHOLDS[metric];
  
  if (isHigherBetter) {
    if (value >= thresholds.excellent) return 100;
    if (value >= thresholds.good) return 85;
    if (value >= thresholds.fair) return 70;
    if (value >= thresholds.poor) return 50;
    return 25;
  } else {
    // For metrics where lower is better (CPA, avgCpc)
    if (value <= thresholds.excellent) return 100;
    if (value <= thresholds.good) return 85;
    if (value <= thresholds.fair) return 70;
    if (value <= thresholds.poor) return 50;
    return 25;
  }
}

/**
 * Calculate efficiency score (ROAS, CPA performance)
 */
function calculateEfficiencyScore(metrics: AccountMetrics['metrics']): number {
  const roasScore = calculateMetricScore(metrics.roas, 'roas', true);
  const cpaScore = calculateMetricScore(metrics.cpa, 'cpa', false);
  
  return (roasScore * 0.6 + cpaScore * 0.4);
}

/**
 * Calculate volume score (reach and traffic)
 */
function calculateVolumeScore(metrics: AccountMetrics['metrics']): number {
  const impressionsScore = calculateMetricScore(metrics.impressions, 'impressions', true);
  const clicksScore = calculateMetricScore(metrics.clicks, 'clicks', true);
  
  return (impressionsScore * 0.4 + clicksScore * 0.6);
}

/**
 * Calculate performance score (conversions and conversion rate)
 */
function calculatePerformanceScore(metrics: AccountMetrics['metrics']): number {
  const conversionsScore = calculateMetricScore(metrics.conversions, 'conversions', true);
  const conversionRateScore = calculateMetricScore(metrics.conversionRate, 'conversionRate', true);
  
  return (conversionsScore * 0.7 + conversionRateScore * 0.3);
}

/**
 * Calculate quality score (CTR, CPC quality)
 */
function calculateQualityScore(metrics: AccountMetrics['metrics']): number {
  const ctrScore = calculateMetricScore(metrics.ctr, 'ctr', true);
  const cpcScore = calculateMetricScore(metrics.avgCpc, 'avgCpc', false);
  
  return (ctrScore * 0.6 + cpcScore * 0.4);
}

/**
 * Generate insights based on metric performance
 */
function generateInsights(account: AccountMetrics, breakdown: AccountHealthScore['breakdown']): string[] {
  const insights: string[] = [];
  const metrics = account.metrics;
  
  // ROAS insights
  if (metrics.roas >= 5.0) {
    insights.push(`🎯 Excellent ROAS of ${metrics.roas.toFixed(1)}x - strong profitability`);
  } else if (metrics.roas < 2.0) {
    insights.push(`⚠️ Low ROAS of ${metrics.roas.toFixed(1)}x - needs optimization`);
  }
  
  // Volume insights
  if (breakdown.volume >= 85) {
    insights.push(`📈 Strong traffic volume with ${metrics.impressions.toLocaleString()} impressions`);
  } else if (breakdown.volume < 50) {
    insights.push(`📉 Limited reach - consider expanding targeting or budget`);
  }
  
  // Conversion insights
  if (metrics.conversions >= 50) {
    insights.push(`✅ Healthy conversion volume of ${metrics.conversions.toFixed(1)} conversions`);
  } else if (metrics.conversions < 10) {
    insights.push(`🔍 Low conversion volume - review targeting and landing pages`);
  }
  
  // CTR insights
  if (metrics.ctr >= 3.0) {
    insights.push(`🎯 Strong CTR of ${metrics.ctr.toFixed(2)}% indicates relevant ads`);
  } else if (metrics.ctr < 1.5) {
    insights.push(`📝 Low CTR of ${metrics.ctr.toFixed(2)}% - consider ad copy optimization`);
  }
  
  return insights.slice(0, 3); // Limit to top 3 insights
}

/**
 * Generate recommendations based on performance gaps
 */
function generateRecommendations(account: AccountMetrics, breakdown: AccountHealthScore['breakdown']): string[] {
  const recommendations: string[] = [];
  const metrics = account.metrics;
  
  // Efficiency recommendations
  if (breakdown.efficiency < 70) {
    if (metrics.roas < 3.0) {
      recommendations.push('🎯 Optimize targeting to improve ROAS');
    }
    if (metrics.cpa > 50) {
      recommendations.push('💰 Review bidding strategy to reduce CPA');
    }
  }
  
  // Volume recommendations
  if (breakdown.volume < 70) {
    recommendations.push('📈 Increase budget or expand targeting to boost reach');
  }
  
  // Performance recommendations
  if (breakdown.performance < 70) {
    if (metrics.conversionRate < 3.0) {
      recommendations.push('🔧 Optimize landing pages to improve conversion rate');
    }
    recommendations.push('📊 Test new ad creatives and extensions');
  }
  
  // Quality recommendations
  if (breakdown.quality < 70) {
    if (metrics.ctr < 2.0) {
      recommendations.push('✏️ Improve ad copy relevance and call-to-actions');
    }
    if (metrics.avgCpc > 2.0) {
      recommendations.push('🎯 Refine keyword targeting to reduce CPC');
    }
  }
  
  return recommendations.slice(0, 3); // Limit to top 3 recommendations
}

/**
 * Convert numerical score to letter grade
 */
function getGrade(score: number): AccountHealthScore['grade'] {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 85) return 'B+';
  if (score >= 80) return 'B';
  if (score >= 75) return 'C+';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Convert numerical score to status
 */
function getStatus(score: number): AccountHealthScore['status'] {
  if (score >= 90) return 'excellent';
  if (score >= 80) return 'good';
  if (score >= 70) return 'fair';
  if (score >= 60) return 'needs-attention';
  return 'critical';
}

/**
 * Calculate comprehensive account health score
 */
export function calculateAccountHealthScore(account: AccountMetrics): AccountHealthScore {
  // Calculate component scores
  const efficiency = calculateEfficiencyScore(account.metrics);
  const volume = calculateVolumeScore(account.metrics);
  const performance = calculatePerformanceScore(account.metrics);
  const quality = calculateQualityScore(account.metrics);
  
  const breakdown = { efficiency, volume, performance, quality };
  
  // Calculate weighted overall score
  const overall = Math.round(
    efficiency * SCORING_WEIGHTS.efficiency +
    volume * SCORING_WEIGHTS.volume +
    performance * SCORING_WEIGHTS.performance +
    quality * SCORING_WEIGHTS.quality
  );
  
  return {
    overall,
    breakdown,
    grade: getGrade(overall),
    status: getStatus(overall),
    insights: generateInsights(account, breakdown),
    recommendations: generateRecommendations(account, breakdown)
  };
}

/**
 * Get health score color styling
 */
export function getHealthScoreStyles(score: number): {
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
} {
  if (score >= 90) {
    return {
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      borderColor: 'border-green-200'
    };
  } else if (score >= 80) {
    return {
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-200'
    };
  } else if (score >= 70) {
    return {
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700',
      borderColor: 'border-yellow-200'
    };
  } else if (score >= 60) {
    return {
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700',
      borderColor: 'border-orange-200'
    };
  } else {
    return {
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
      borderColor: 'border-red-200'
    };
  }
}

/**
 * Calculate MCC-level health summary
 */
export function calculateMccHealthSummary(accounts: AccountMetrics[]): {
  averageScore: number;
  distribution: Record<AccountHealthScore['status'], number>;
  topPerformers: AccountMetrics[];
  needsAttention: AccountMetrics[];
} {
  const scores = accounts.map(account => calculateAccountHealthScore(account));
  
  const averageScore = Math.round(
    scores.reduce((sum, score) => sum + score.overall, 0) / scores.length
  );
  
  const distribution = scores.reduce((dist, score) => {
    dist[score.status] = (dist[score.status] || 0) + 1;
    return dist;
  }, {} as Record<AccountHealthScore['status'], number>);
  
  const accountsWithScores = accounts.map((account, index) => ({
    ...account,
    healthScore: scores[index].overall
  }));
  
  const topPerformers = accountsWithScores
    .filter(account => account.healthScore >= 85)
    .sort((a, b) => b.healthScore - a.healthScore)
    .slice(0, 5);
    
  const needsAttention = accountsWithScores
    .filter(account => account.healthScore < 70)
    .sort((a, b) => a.healthScore - b.healthScore)
    .slice(0, 5);
  
  return {
    averageScore,
    distribution,
    topPerformers,
    needsAttention
  };
}
