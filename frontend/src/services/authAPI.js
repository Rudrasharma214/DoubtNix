import axios from 'axios';

// Environment-aware API URL
const API_BASE_URL = import.meta.env.VITE_API_URL ||
                    (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

// Create axios instance with default config
const authAPI = axios.create({
  baseURL: `${API_BASE_URL}/auth`,
  // baseURL: '/api/auth',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
authAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token refresh on 401 responses
authAPI.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const response = await authAPI.post('/refresh-token', {
            refreshToken,
          });

          const { token, refreshToken: newRefreshToken } = response.data.data;
          localStorage.setItem('authToken', token);
          localStorage.setItem('refreshToken', newRefreshToken);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return authAPI(originalRequest);
        } catch (refreshError) {
          // Refresh failed, redirect to login
          localStorage.removeItem('authToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token, redirect to login
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// Auth API methods
export const authService = {
  // Authentication
  register: async (userData) => {
    const response = await authAPI.post('/register', userData);
    return response.data;
  },

  login: async (credentials) => {
    const response = await authAPI.post('/login', credentials);
    return response.data;
  },

  logout: async () => {
    const response = await authAPI.post('/logout');
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    return response.data;
  },

  refreshToken: async (refreshToken) => {
    const response = await authAPI.post('/refresh-token', { refreshToken });
    return response.data;
  },

  // Email OTP for login
  resendLoginOTP: async (email) => {
    const response = await authAPI.post('/resend-login-otp', { email });
    return response.data;
  },

  // Password reset with OTP
  resetPasswordWithOTP: async (email, otp, newPassword) => {
    const response = await authAPI.post('/reset-password', { email, otp, newPassword });
    return response.data;
  },

  resendPasswordResetOTP: async (email) => {
    const response = await authAPI.post('/resend-password-reset-otp', { email });
    return response.data;
  },

  // Email verification
  verifyEmail: async (token) => {
    const response = await authAPI.post('/verify-email', { token });
    return response.data;
  },

  resendVerificationEmail: async (email) => {
    const response = await authAPI.post('/resend-verification', { email });
    return response.data;
  },

  // Password reset
  forgotPassword: async (email) => {
    const response = await authAPI.post('/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token, newPassword) => {
    const response = await authAPI.post('/reset-password', { token, newPassword });
    return response.data;
  },

  // Profile management
  getProfile: async () => {
    const response = await authAPI.get('/profile');
    return response.data;
  },

  updateProfile: async (profileData) => {
    const response = await authAPI.put('/profile', profileData);
    return response.data;
  },

  changePassword: async (currentPassword, newPassword) => {
    const response = await authAPI.put('/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  deleteAccount: async (password) => {
    const response = await authAPI.delete('/account', { data: { password } });
    return response.data;
  },

  // Two-Factor Authentication
  setup2FA: async () => {
    const response = await authAPI.post('/2fa/setup');
    return response.data;
  },

  enable2FA: async (token) => {
    const response = await authAPI.post('/2fa/enable', { token });
    return response.data;
  },

  disable2FA: async (password, token) => {
    const response = await authAPI.post('/2fa/disable', { password, token });
    return response.data;
  },

  verify2FA: async (token, backupCode = null) => {
    const response = await authAPI.post('/2fa/verify', { token, backupCode });
    return response.data;
  },

  generateBackupCodes: async (password) => {
    const response = await authAPI.post('/2fa/backup-codes', { password });
    return response.data;
  },
};

// Helper functions
export const authUtils = {
  // Token management
  setTokens: (token, refreshToken) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('refreshToken', refreshToken);
  },

  getToken: () => {
    return localStorage.getItem('authToken');
  },

  getRefreshToken: () => {
    return localStorage.getItem('refreshToken');
  },

  removeTokens: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
  },

  // User data management
  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
  },

  getUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  removeUser: () => {
    localStorage.removeItem('user');
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');
    return !!(token && user);
  },

  // Check if email is verified
  isEmailVerified: () => {
    const user = authUtils.getUser();
    return user?.isEmailVerified || false;
  },

  // Check if 2FA is enabled
  is2FAEnabled: () => {
    const user = authUtils.getUser();
    return user?.twoFactorEnabled || false;
  },

  // Clear all auth data
  clearAuthData: () => {
    authUtils.removeTokens();
    authUtils.removeUser();
  },
};

export default authService;
