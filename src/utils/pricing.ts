// Pricing configuration utility
// This centralizes all pricing logic and reads from environment variables
// To change pricing, update the values in your .env file

interface PricingConfig {
  monthly: {
    price: number;
    formatted: string;
    description: string;
  };
  yearly: {
    price: number;
    formatted: string;
    description: string;
    savings: {
      percentage: number;
      monthlyEquivalent: string;
    };
  };
  currency: {
    symbol: string;
    code: string;
  };
}

// Get pricing from environment variables with fallbacks
const getEnvPrice = (key: string, fallback: number): number => {
  const value = process.env[key];
  return value ? parseFloat(value) : fallback;
};

const getEnvString = (key: string, fallback: string): string => {
  return process.env[key] || fallback;
};

// Calculate pricing configuration
const createPricingConfig = (): PricingConfig => {
  const monthlyPrice = getEnvPrice('EXPO_PUBLIC_PREMIUM_MONTHLY_PRICE', 2.99);
  const yearlyPrice = getEnvPrice('EXPO_PUBLIC_PREMIUM_YEARLY_PRICE', 20.00);
  const currencySymbol = getEnvString('EXPO_PUBLIC_PREMIUM_CURRENCY_SYMBOL', '£');
  const currencyCode = getEnvString('EXPO_PUBLIC_PREMIUM_CURRENCY_CODE', 'GBP');

  // Calculate savings
  const yearlyMonthlyEquivalent = yearlyPrice / 12;
  const savingsPercentage = Math.round(((monthlyPrice * 12 - yearlyPrice) / (monthlyPrice * 12)) * 100);

  return {
    monthly: {
      price: monthlyPrice,
      formatted: `${currencySymbol}${monthlyPrice.toFixed(2)}`,
      description: 'per month',
    },
    yearly: {
      price: yearlyPrice,
      formatted: `${currencySymbol}${yearlyPrice.toFixed(2)}`,
      description: 'per year',
      savings: {
        percentage: savingsPercentage,
        monthlyEquivalent: `${currencySymbol}${yearlyMonthlyEquivalent.toFixed(2)}`,
      },
    },
    currency: {
      symbol: currencySymbol,
      code: currencyCode,
    },
  };
};

// Export the pricing configuration
export const pricingConfig = createPricingConfig();

// Utility functions for common pricing displays
export const getPremiumPricing = () => pricingConfig;

export const getFormattedMonthlyPrice = () => pricingConfig.monthly.formatted;

export const getFormattedYearlyPrice = () => pricingConfig.yearly.formatted;

export const getYearlySavings = () => ({
  percentage: pricingConfig.yearly.savings.percentage,
  monthlyEquivalent: pricingConfig.yearly.savings.monthlyEquivalent,
});

export const getPricingDisplayText = (plan: 'monthly' | 'yearly') => {
  const config = pricingConfig[plan];
  return `${config.formatted} ${config.description}`;
};

export const getUpgradeBannerText = () => {
  return `Unlock unlimited custom chores & rewards - ${pricingConfig.yearly.formatted}/year`;
};

export const getSettingsUpgradeText = () => {
  return `Unlock unlimited members and features - ${pricingConfig.yearly.formatted}/year`;
};

export default pricingConfig; 