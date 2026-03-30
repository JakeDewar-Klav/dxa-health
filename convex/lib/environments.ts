export type DemoEnvironment = {
  id: string;
  name: string;
  platform: string;
  region: string;
  narrative: string;
  apiKeyEnvVar: string;
  criticalMetrics: string[];
};

export const DEMO_ENVIRONMENTS: DemoEnvironment[] = [
  {
    id: "shopify-demo",
    name: "Shopify [[DEMO]]",
    platform: "Shopify",
    region: "US",
    narrative: "Default Shopify / K Service demo",
    apiKeyEnvVar: "KLAVIYO_API_KEY_SHOPIFY",
    criticalMetrics: ["Placed Order", "Viewed Product", "Started Checkout", "Active on Site"],
  },
  {
    id: "woo-demo",
    name: "WooCommerce [[DEMO]]",
    platform: "WooCommerce",
    region: "US",
    narrative: "WooCommerce customer demos",
    apiKeyEnvVar: "KLAVIYO_API_KEY_WOO",
    criticalMetrics: ["Placed Order", "Viewed Product", "Started Checkout", "Active on Site"],
  },
  {
    id: "sfcc-demo",
    name: "SFCC [[DEMO]]",
    platform: "SFCC",
    region: "US",
    narrative: "Commerce Cloud demo",
    apiKeyEnvVar: "KLAVIYO_API_KEY_SFCC",
    criticalMetrics: ["Placed Order", "Viewed Product", "Started Checkout", "Active on Site"],
  },
  {
    id: "magento2-demo",
    name: "Magento 2 [[DEMO]]",
    platform: "Magento 2",
    region: "US",
    narrative: "Magento 2 integration demo",
    apiKeyEnvVar: "KLAVIYO_API_KEY_MAGENTO2",
    criticalMetrics: ["Placed Order", "Viewed Product", "Started Checkout", "Active on Site"],
  },
  {
    id: "bigcommerce-demo",
    name: "BigCommerce [[DEMO]]",
    platform: "BigCommerce",
    region: "US",
    narrative: "BigCommerce integration demo",
    apiKeyEnvVar: "KLAVIYO_API_KEY_BIGCOMMERCE",
    criticalMetrics: ["Placed Order", "Viewed Product", "Started Checkout", "Active on Site"],
  },
  {
    id: "k-service-demo",
    name: "K Service Demo",
    platform: "Shopify",
    region: "US",
    narrative: "Klaviyo Service showcase",
    apiKeyEnvVar: "KLAVIYO_API_KEY_KSERVICE",
    criticalMetrics: ["Placed Order", "Viewed Product", "Active on Site", "Opened Email"],
  },
  {
    id: "ma-demo",
    name: "Marketing Analytics [[DEMO]]",
    platform: "Shopify",
    region: "US",
    narrative: "Marketing Analytics deep dive",
    apiKeyEnvVar: "KLAVIYO_API_KEY_MA",
    criticalMetrics: ["Placed Order", "Opened Email", "Clicked Email", "Active on Site"],
  },
  {
    id: "cafe-demo",
    name: "Cafe [[DEMO]]",
    platform: "Shopify",
    region: "US",
    narrative: "Cafe brand demo environment",
    apiKeyEnvVar: "KLAVIYO_API_KEY_CAFE",
    criticalMetrics: ["Placed Order", "Viewed Product", "Started Checkout", "Active on Site"],
  },
  {
    id: "prestashop-demo",
    name: "PrestaShop [[DEMO]]",
    platform: "PrestaShop",
    region: "US",
    narrative: "PrestaShop integration demo",
    apiKeyEnvVar: "KLAVIYO_API_KEY_PRESTASHOP",
    criticalMetrics: ["Placed Order", "Viewed Product", "Started Checkout", "Active on Site"],
  },
  {
    id: "zenoti-demo",
    name: "Zenoti [[DEMO]]",
    platform: "Zenoti",
    region: "US",
    narrative: "Zenoti integration demo",
    apiKeyEnvVar: "KLAVIYO_API_KEY_ZENOTI",
    criticalMetrics: ["Placed Order", "Viewed Product", "Active on Site"],
  },
  {
    id: "apac-demo",
    name: "APAC [[DEMO]]",
    platform: "Shopify",
    region: "APAC",
    narrative: "APAC regional demo",
    apiKeyEnvVar: "KLAVIYO_API_KEY_APAC",
    criticalMetrics: ["Placed Order", "Viewed Product", "Active on Site"],
  },
  {
    id: "mindbody-demo",
    name: "Mindbody [[DEMO]]",
    platform: "Mindbody",
    region: "US",
    narrative: "Mindbody integration demo",
    apiKeyEnvVar: "KLAVIYO_API_KEY_MINDBODY",
    criticalMetrics: ["Placed Order", "Viewed Product", "Active on Site"],
  },
];
