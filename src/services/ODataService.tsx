import axios from 'axios';

import { getApiBaseUrlSync } from '../utils/apiBase';

const BASE_URL = getApiBaseUrlSync();

class ODataService {
  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor for better error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('OData Service Error:', error.message);
        return Promise.reject(error);
      }
    );
  }

  async get(url, params = {}) {
    try {
      console.log(`📡 OData GET: ${url}`, params);
      
      const response = await this.client.get(url, { params });
      
      console.log(`✅ OData GET Success: ${url}`, response.data);
      return response.data;
    } catch (error) {
      console.error(`❌ OData GET Error: ${url}`, error.message);
      throw error;
    }
  }

  async post(url, data = {}) {
    try {
      console.log(`📡 OData POST: ${url}`, data);
      
      const response = await this.client.post(url, data);
      
      console.log(`✅ OData POST Success: ${url}`, response.data);
      return response.data;
    } catch (error) {
      console.error(`❌ OData POST Error: ${url}`, error.message);
      throw error;
    }
  }

  async put(url, data = {}) {
    try {
      console.log(`📡 OData PUT: ${url}`, data);
      
      const response = await this.client.put(url, data);
      
      console.log(`✅ OData PUT Success: ${url}`, response.data);
      return response.data;
    } catch (error) {
      console.error(`❌ OData PUT Error: ${url}`, error.message);
      throw error;
    }
  }

  async delete(url) {
    try {
      console.log(`📡 OData DELETE: ${url}`);
      
      const response = await this.client.delete(url);
      
      console.log(`✅ OData DELETE Success: ${url}`, response.data);
      return response.data;
    } catch (error) {
      console.error(`❌ OData DELETE Error: ${url}`, error.message);
      throw error;
    }
  }

  // Helper method to ensure service is properly initialized
  isInitialized() {
    return this.client !== null && this.client !== undefined;
  }
}

// Create and export a singleton instance
const oDataService = new ODataService();
export default oDataService;