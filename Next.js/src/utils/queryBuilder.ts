/**
 * Google Ads Query Language (GAQL) Builder Utility
 * Eliminates duplicate query construction across API routes
 */

export interface QueryOptions {
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  customFilters?: string[];
  orderBy?: string;
  limit?: number;
}

/**
 * Base query builder class for Google Ads GAQL queries
 */
class GAQLQueryBuilder {
  private selectFields: string[] = [];
  private fromTable: string = '';
  private whereConditions: string[] = [];
  private orderByClause: string = '';
  private limitClause: string = '';

  select(fields: string[]): this {
    this.selectFields = fields;
    return this;
  }

  from(table: string): this {
    this.fromTable = table;
    return this;
  }

  where(condition: string): this {
    this.whereConditions.push(condition);
    return this;
  }

  dateRange(startDate: string, endDate: string): this {
    this.whereConditions.push(`segments.date BETWEEN '${startDate}' AND '${endDate}'`);
    return this;
  }

  orderBy(field: string, direction: 'ASC' | 'DESC' = 'DESC'): this {
    this.orderByClause = `ORDER BY ${field} ${direction}`;
    return this;
  }

  limit(count: number): this {
    this.limitClause = `LIMIT ${count}`;
    return this;
  }

  build(): string {
    const selectClause = `SELECT ${this.selectFields.join(', ')}`;
    const fromClause = `FROM ${this.fromTable}`;
    const whereClause = this.whereConditions.length > 0 ? `WHERE ${this.whereConditions.join(' AND ')}` : '';
    
    const clauses = [selectClause, fromClause, whereClause, this.orderByClause, this.limitClause]
      .filter(clause => clause.length > 0);
    
    return clauses.join(' ');
  }
}

/**
 * Pre-built query configurations for common Google Ads entities
 */
export const QueryTemplates = {
  // Campaign performance query
  campaignPerformance: (options: QueryOptions = {}) => {
    const builder = new GAQLQueryBuilder()
      .select([
        'campaign.id',
        'campaign.name',
        'campaign.status',
        'metrics.impressions',
        'metrics.clicks',
        'metrics.cost_micros',
        'metrics.ctr',
        'metrics.average_cpc',
        'metrics.conversions',
        'metrics.conversions_value'
      ])
      .from('campaign')
      .where("campaign.status = 'ENABLED'");

    if (options.dateRange) {
      builder.dateRange(options.dateRange.startDate, options.dateRange.endDate);
    }

    if (options.customFilters) {
      options.customFilters.forEach(filter => builder.where(filter));
    }

    if (options.orderBy) {
      builder.orderBy(options.orderBy);
    } else {
      builder.orderBy('metrics.impressions', 'DESC');
    }

    if (options.limit) {
      builder.limit(options.limit);
    }

    return builder.build();
  },

  // Ad group performance query
  adGroupPerformance: (options: QueryOptions = {}) => {
    const builder = new GAQLQueryBuilder()
      .select([
        'ad_group.id',
        'ad_group.name',
        'ad_group.status',
        'ad_group.type',
        'campaign.id',
        'campaign.name',
        'metrics.impressions',
        'metrics.clicks',
        'metrics.cost_micros',
        'metrics.ctr',
        'metrics.average_cpc',
        'metrics.conversions',
        'metrics.conversions_value'
      ])
      .from('ad_group')
      .where("ad_group.status = 'ENABLED'");

    if (options.dateRange) {
      builder.dateRange(options.dateRange.startDate, options.dateRange.endDate);
    }

    if (options.customFilters) {
      options.customFilters.forEach(filter => builder.where(filter));
    }

    builder.orderBy('metrics.impressions', 'DESC');

    return builder.build();
  },

  // Asset group performance query (for Performance Max campaigns)
  assetGroupPerformance: (options: QueryOptions = {}) => {
    const builder = new GAQLQueryBuilder()
      .select([
        'asset_group.id',
        'asset_group.name',
        'asset_group.status',
        'campaign.id',
        'campaign.name',
        'metrics.impressions',
        'metrics.clicks',
        'metrics.cost_micros',
        'metrics.ctr',
        'metrics.average_cpc',
        'metrics.conversions',
        'metrics.conversions_value'
      ])
      .from('asset_group')
      .where("asset_group.status = 'ENABLED'");

    if (options.dateRange) {
      builder.dateRange(options.dateRange.startDate, options.dateRange.endDate);
    }

    if (options.customFilters) {
      options.customFilters.forEach(filter => builder.where(filter));
    }

    builder.orderBy('metrics.impressions', 'DESC');

    return builder.build();
  },

  // Keywords performance query  
  keywordPerformance: (options: QueryOptions = {}) => {
    const builder = new GAQLQueryBuilder()
      .select([
        'ad_group_criterion.keyword.text',
        'ad_group_criterion.keyword.match_type',
        'ad_group_criterion.status',
        'ad_group.id',
        'ad_group.name',
        'campaign.id',
        'campaign.name',
        'metrics.impressions',
        'metrics.clicks',
        'metrics.cost_micros',
        'metrics.ctr',
        'metrics.average_cpc',
        'metrics.conversions',
        'metrics.conversions_value'
      ])
      .from('keyword_view')
      .where("ad_group_criterion.status = 'ENABLED'")
      .where("ad_group_criterion.type = 'KEYWORD'");

    if (options.dateRange) {
      builder.dateRange(options.dateRange.startDate, options.dateRange.endDate);
    }

    if (options.customFilters) {
      options.customFilters.forEach(filter => builder.where(filter));
    }

    builder.orderBy('metrics.impressions', 'DESC');

    if (options.limit) {
      builder.limit(options.limit);
    }

    return builder.build();
  },

  // Search terms performance query
  searchTermsPerformance: (options: QueryOptions = {}) => {
    const builder = new GAQLQueryBuilder()
      .select([
        'search_term_view.search_term',
        'search_term_view.status',
        'ad_group.id',
        'ad_group.name',
        'campaign.id',
        'campaign.name',
        'metrics.impressions',
        'metrics.clicks',
        'metrics.cost_micros',
        'metrics.ctr',
        'metrics.average_cpc',
        'metrics.conversions',
        'metrics.conversions_value'
      ])
      .from('search_term_view')
      .where("search_term_view.status != 'NONE'");

    if (options.dateRange) {
      builder.dateRange(options.dateRange.startDate, options.dateRange.endDate);
    }

    if (options.customFilters) {
      options.customFilters.forEach(filter => builder.where(filter));
    }

    builder.orderBy('metrics.impressions', 'DESC');

    if (options.limit) {
      builder.limit(options.limit);
    }

    return builder.build();
  },

  // Daily performance query for historical data
  dailyPerformance: (options: QueryOptions = {}) => {
    const builder = new GAQLQueryBuilder()
      .select([
        'segments.date',
        'metrics.impressions',
        'metrics.clicks',
        'metrics.cost_micros',
        'metrics.ctr',
        'metrics.average_cpc',
        'metrics.conversions',
        'metrics.conversions_value'
      ])
      .from('campaign')
      .where("campaign.status = 'ENABLED'");

    if (options.dateRange) {
      builder.dateRange(options.dateRange.startDate, options.dateRange.endDate);
    }

    if (options.customFilters) {
      options.customFilters.forEach(filter => builder.where(filter));
    }

    builder.orderBy('segments.date', 'ASC');

    return builder.build();
  },

  // Account information query
  accountInfo: () => {
    return new GAQLQueryBuilder()
      .select([
        'customer.id',
        'customer.descriptive_name',
        'customer.currency_code',
        'customer.time_zone',
        'customer.country_code'
      ])
      .from('customer')
      .build();
  }
};

/**
 * Helper function to create custom queries with the builder
 */
export function createQuery(): GAQLQueryBuilder {
  return new GAQLQueryBuilder();
}

/**
 * Campaign type detection utilities
 */
export const CampaignTypeDetector = {
  /**
   * Determines campaign type from name and other properties
   */
  detectCampaignType: (campaignName: string): 'search' | 'shopping' | 'display' | 'video' | 'performance_max' | 'unknown' => {
    const nameLower = campaignName.toLowerCase();
    
    if (nameLower.includes('performance max') || nameLower.includes('pmax')) {
      return 'performance_max';
    }
    
    if (nameLower.includes('shopping') || nameLower.includes('shop')) {
      return 'shopping';
    }
    
    if (nameLower.includes('search') || nameLower.includes('brand') || nameLower.includes('generic')) {
      return 'search';
    }
    
    if (nameLower.includes('display') || nameLower.includes('banner')) {
      return 'display';
    }
    
    if (nameLower.includes('video') || nameLower.includes('youtube')) {
      return 'video';
    }
    
    return 'unknown';
  },

  /**
   * Groups campaigns by detected type
   */
  groupCampaignsByType: (campaigns: any[]): Record<string, any[]> => {
    const groups: Record<string, any[]> = {};
    
    campaigns.forEach(campaign => {
      const type = CampaignTypeDetector.detectCampaignType(campaign.name);
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(campaign);
    });
    
    return groups;
  }
};

/**
 * Match type utilities for keywords
 */
export const MatchTypeUtilities = {
  /**
   * Convert Google Ads match type enum to readable string
   */
  getMatchTypeString: (matchType: number): string => {
    switch (matchType) {
      case 2: return 'Exact';
      case 3: return 'Phrase';
      case 4: return 'Broad';
      default: return 'Unknown';
    }
  },

  /**
   * Group keywords by match type
   */
  groupKeywordsByMatchType: (keywords: any[]): Record<string, any[]> => {
    const groups: Record<string, any[]> = {};
    
    keywords.forEach(keyword => {
      const matchType = MatchTypeUtilities.getMatchTypeString(keyword.matchType);
      if (!groups[matchType]) {
        groups[matchType] = [];
      }
      groups[matchType].push(keyword);
    });
    
    return groups;
  }
}; 