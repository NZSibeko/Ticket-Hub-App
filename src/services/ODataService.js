import axios from 'axios';
import { Buffer } from 'buffer';

class ODataService {
  static instance = null;
  static config = {};

  static init(config) {
    this.config = config;
    this.instance = axios.create({
      baseURL: `${config.baseUrl}${config.servicePath}`,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 10000
    });

    // Add request interceptor for logging
    this.instance.interceptors.request.use(
      (config) => {
        console.log('OData Request:', config.method?.toUpperCase(), config.url);
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.instance.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        return Promise.reject(this.handleError(error));
      }
    );

    // Add auth interceptor if credentials provided
    if (config.auth) {
      this.setAuth(config.auth.username, config.auth.password);
    }
  }

  static setAuth(username, password) {
    const token = Buffer.from(`${username}:${password}`).toString('base64');
    this.instance.defaults.headers.common['Authorization'] = `Basic ${token}`;
  }

  static clearAuth() {
    delete this.instance.defaults.headers.common['Authorization'];
  }

  static handleError(error) {
    console.error('OData Service Error:', error);
    
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const message = error.response.data?.error?.message?.value || error.message;
      
      switch (status) {
        case 400:
          return new Error(`Bad Request: ${message}`);
        case 401:
          return new Error('Authentication failed - Please check your credentials');
        case 403:
          return new Error('Access denied - You do not have permission');
        case 404:
          return new Error('Resource not found');
        case 409:
          return new Error('Conflict - Resource already exists');
        case 500:
          return new Error('Server error - Please try again later');
        default:
          return new Error(`Server error (${status}): ${message}`);
      }
    } else if (error.request) {
      // Request made but no response received
      if (error.code === 'ECONNABORTED') {
        return new Error('Request timeout - Please check your connection');
      }
      return new Error('Network error - Please check your internet connection');
    } else {
      // Something else happened
      return new Error('An unexpected error occurred');
    }
  }

  static async get(entitySet, queryOptions = {}) {
    try {
      const response = await this.instance.get(`/${entitySet}`, {
        params: queryOptions
      });
      return response.data.d?.results || response.data.value || response.data;
    } catch (error) {
      console.error('OData GET error:', error);
      throw error;
    }
  }

  static async post(entitySet, data) {
    try {
      const response = await this.instance.post(`/${entitySet}`, data);
      return response.data.d || response.data;
    } catch (error) {
      console.error('OData POST error:', error);
      throw error;
    }
  }

  static async patch(entitySet, key, data) {
    try {
      const response = await this.instance.patch(
        `/${entitySet}('${key}')`,
        data
      );
      return response.data.d || response.data;
    } catch (error) {
      console.error('OData PATCH error:', error);
      throw error;
    }
  }

  static async delete(entitySet, key) {
    try {
      const response = await this.instance.delete(`/${entitySet}('${key}')`);
      return response.data;
    } catch (error) {
      console.error('OData DELETE error:', error);
      throw error;
    }
  }

  static async action(entitySet, key, actionName, parameters = {}) {
    try {
      const response = await this.instance.post(
        `/${entitySet}('${key}')/${actionName}`,
        parameters
      );
      return response.data.d || response.data;
    } catch (error) {
      console.error('OData Action error:', error);
      throw error;
    }
  }

  // Batch operations for multiple requests
  static async batch(requests) {
    try {
      const batchData = {
        requests: requests.map(req => ({
          id: req.id || Math.random().toString(36).substr(2, 9),
          method: req.method || 'GET',
          url: req.url,
          headers: req.headers || {},
          body: req.body
        }))
      };

      const response = await this.instance.post('/$batch', batchData, {
        headers: {
          'Content-Type': 'multipart/mixed'
        }
      });
      return response.data;
    } catch (error) {
      console.error('OData Batch error:', error);
      throw error;
    }
  }

  // Metadata retrieval
  static async getMetadata() {
    try {
      const response = await this.instance.get('/$metadata');
      return response.data;
    } catch (error) {
      console.error('OData Metadata error:', error);
      throw error;
    }
  }
}

export default ODataService;