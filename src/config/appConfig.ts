/**
 * Application configuration file
 * 
 * This file contains configuration settings for the application.
 * For production, these values should be set through environment variables.
 */

// API Configuration
export const API_CONFIG = {
  // Base URL for the Flask backend API
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
  
  // Timeout for API requests in milliseconds
  TIMEOUT: 30000,
  
  // Default headers for API requests
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
  },
};

// OpenAI Configuration
export const OPENAI_CONFIG = {
  // OpenAI API Key - should be set as an environment variable in production
  API_KEY: import.meta.env.VITE_OPENAI_API_KEY || '',
  
  // Default model to use for chat completions
  DEFAULT_MODEL: 'gpt-4o-mini',
  
  // API endpoint for chat completions
  API_URL: 'https://api.openai.com/v1/chat/completions',
  
  // System message to define assistant behavior
  SYSTEM_MESSAGE: 'You are Helix, an AI recruiting assistant. Help create effective recruiting outreach sequences.',
  
  // Temperature setting (0.0 to 1.0) - lower is more deterministic
  TEMPERATURE: 0.7,
  
  // Maximum tokens to generate in responses
  MAX_TOKENS: 1000,
};

// Anthropic Configuration
export const ANTHROPIC_CONFIG = {
  // Anthropic API Key - should be set as an environment variable in production
  API_KEY: import.meta.env.VITE_ANTHROPIC_API_KEY || '',
  
  // Default model to use for chat completions
  DEFAULT_MODEL: 'claude-3-5-sonnet-20241022',
  
  // API endpoint for chat completions
  API_URL: 'https://api.anthropic.com/v1/messages',
  
  // System message to define assistant behavior
  SYSTEM_MESSAGE: 'You are Helix, an AI recruiting assistant. Help create effective recruiting outreach sequences.',
  
  // Temperature setting (0.0 to 1.0) - lower is more deterministic
  TEMPERATURE: 0.7,
  
  // Maximum tokens to generate in responses
  MAX_TOKENS: 1000,
};

// Database Configuration (if connecting directly from frontend for development)
export const DB_CONFIG = {
  // Database connection details would go here if needed
  // In production, database connections should be handled by the backend
};

// User Configuration
export const USER_CONFIG = {
  // Default user ID for demo purposes - in production would come from authentication
  DEFAULT_USER_ID: 'demo-user-123',
};

// Feature flags
export const FEATURES = {
  USE_BACKEND_API: true, // Set to false to use direct OpenAI calls (development only)
  USE_ANTHROPIC: true, // Set to true to use Anthropic instead of OpenAI
  ENABLE_ANALYTICS: false,
  DEBUG_MODE: import.meta.env.DEV,
};
