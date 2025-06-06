import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authService, authUtils } from '../services/authAPI';
import toast from 'react-hot-toast';

// Initial state
const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  // isEmailVerified removed - users are auto-verified
  is2FAEnabled: false,
  requiresTwoFactor: false,
  requiresEmailOTP: false,
  tempToken: null,
};

// Action types
const AUTH_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_2FA_REQUIRED: 'LOGIN_2FA_REQUIRED',
  LOGIN_EMAIL_OTP_REQUIRED: 'LOGIN_EMAIL_OTP_REQUIRED',
  LOGOUT: 'LOGOUT',
  UPDATE_USER: 'UPDATE_USER',
  // SET_EMAIL_VERIFIED removed
  SET_2FA_ENABLED: 'SET_2FA_ENABLED',
  CLEAR_2FA_REQUIREMENT: 'CLEAR_2FA_REQUIREMENT',
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        isLoading: false,
        // isEmailVerified removed - users are auto-verified
        is2FAEnabled: action.payload.user.twoFactorEnabled,
        requiresTwoFactor: false,
        tempToken: null,
      };

    case AUTH_ACTIONS.LOGIN_2FA_REQUIRED:
      return {
        ...state,
        requiresTwoFactor: true,
        tempToken: action.payload.tempToken,
        isLoading: false,
      };

    case AUTH_ACTIONS.LOGIN_EMAIL_OTP_REQUIRED:
      return {
        ...state,
        requiresEmailOTP: true,
        tempToken: action.payload.tempToken,
        isLoading: false,
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...initialState,
        isLoading: false,
      };

    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload },
        // isEmailVerified removed - users are auto-verified
        is2FAEnabled: action.payload.twoFactorEnabled ?? state.is2FAEnabled,
      };

    // SET_EMAIL_VERIFIED case removed

    case AUTH_ACTIONS.SET_2FA_ENABLED:
      return {
        ...state,
        is2FAEnabled: action.payload,
        user: state.user ? { ...state.user, twoFactorEnabled: action.payload } : null,
      };

    case AUTH_ACTIONS.CLEAR_2FA_REQUIREMENT:
      return {
        ...state,
        requiresTwoFactor: false,
        requiresEmailOTP: false,
        tempToken: null,
      };

    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize auth state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (authUtils.isAuthenticated()) {
          const user = authUtils.getUser();
          dispatch({
            type: AUTH_ACTIONS.LOGIN_SUCCESS,
            payload: { user },
          });
        } else {
          dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        authUtils.clearAuthData();
        dispatch({ type: AUTH_ACTIONS.LOGOUT });
      }
    };

    initializeAuth();
  }, []);

  // Auth actions
  const login = async (credentials) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });

      console.log('🔐 Login attempt with credentials:', {
        email: credentials.email,
        hasPassword: !!credentials.password,
        hasEmailOTP: !!credentials.emailOTP,
        hasTwoFactorCode: !!credentials.twoFactorCode
      });

      const response = await authService.login(credentials);

      if (response.requiresEmailOTP) {
        console.log('📧 Email OTP required - updating state');
        dispatch({
          type: AUTH_ACTIONS.LOGIN_EMAIL_OTP_REQUIRED,
          payload: { tempToken: response.tempToken },
        });
        return { requiresEmailOTP: true };
      }

      if (response.requiresTwoFactor) {
        dispatch({
          type: AUTH_ACTIONS.LOGIN_2FA_REQUIRED,
          payload: { tempToken: response.tempToken },
        });
        return { requiresTwoFactor: true };
      }
      
      const { user, token, refreshToken } = response.data;
      
      // Store tokens and user data
      authUtils.setTokens(token, refreshToken);
      authUtils.setUser(user);
      
      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { user },
      });

      // Clear login credentials from session storage
      sessionStorage.removeItem('loginCredentials');

      toast.success('Login successful!');
      return { success: true };
    } catch (error) {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      
      const response = await authService.register(userData);
      
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      toast.success('Registration successful! Please check your email for verification.');
      
      return response;
    } catch (error) {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      authUtils.clearAuthData();
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      toast.success('Logged out successfully');
    }
  };

  const verify2FA = async (token, backupCode = null) => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      
      await authService.verify2FA(token, backupCode);
      
      // After successful 2FA verification, complete the login
      dispatch({ type: AUTH_ACTIONS.CLEAR_2FA_REQUIREMENT });
      
      // Get user profile to update state
      const profileResponse = await authService.getProfile();
      const user = profileResponse.data.user;
      
      authUtils.setUser(user);
      
      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { user },
      });
      
      toast.success('Two-factor authentication verified!');
      return { success: true };
    } catch (error) {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      const message = error.response?.data?.message || '2FA verification failed';
      toast.error(message);
      throw error;
    }
  };

  // Email verification removed - users are auto-verified on signup

  const updateProfile = async (profileData) => {
    try {
      const response = await authService.updateProfile(profileData);
      const updatedUser = response.data.user;
      
      authUtils.setUser(updatedUser);
      dispatch({ type: AUTH_ACTIONS.UPDATE_USER, payload: updatedUser });
      
      toast.success('Profile updated successfully!');
      return response;
    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed';
      toast.error(message);
      throw error;
    }
  };

  const enable2FA = async (token) => {
    try {
      await authService.enable2FA(token);
      
      dispatch({ type: AUTH_ACTIONS.SET_2FA_ENABLED, payload: true });
      
      // Update user in localStorage
      const user = authUtils.getUser();
      if (user) {
        user.twoFactorEnabled = true;
        authUtils.setUser(user);
      }
      
      toast.success('Two-factor authentication enabled!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to enable 2FA';
      toast.error(message);
      throw error;
    }
  };

  const disable2FA = async (password, token) => {
    try {
      await authService.disable2FA(password, token);

      dispatch({ type: AUTH_ACTIONS.SET_2FA_ENABLED, payload: false });

      // Update user in localStorage
      const user = authUtils.getUser();
      if (user) {
        user.twoFactorEnabled = false;
        authUtils.setUser(user);
      }

      toast.success('Two-factor authentication disabled!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to disable 2FA';
      toast.error(message);
      throw error;
    }
  };

  const resendLoginOTP = async (email) => {
    try {
      await authService.resendLoginOTP(email);
      toast.success('New verification code sent to your email!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to resend verification code';
      toast.error(message);
      throw error;
    }
  };

  // Context value
  const value = {
    ...state,
    login,
    register,
    logout,
    verify2FA,
    // verifyEmail removed
    updateProfile,
    enable2FA,
    disable2FA,
    resendLoginOTP,
    authService,
    authUtils,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
