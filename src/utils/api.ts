/**
 * API Configuration
 * 
 * Dynamically selects the API base URL based on the environment:
 * - Development: http://localhost:10000 (local backend server)
 * - Production: https://torquegpt.onrender.com (production server)
 */

// Use Vite's environment detection
export const API_BASE_URL = import.meta.env.DEV 
  ? 'http://localhost:10000'  // Local development server
  : 'https://torquegpt.onrender.com'  // Production server

console.log(`🌐 API Base URL: ${API_BASE_URL}`)