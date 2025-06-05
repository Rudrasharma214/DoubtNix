import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Mail, Lock, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    emailOTP: '',
    twoFactorCode: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [storedCredentials, setStoredCredentials] = useState(() => {
    // Try to get stored credentials from sessionStorage
    const stored = sessionStorage.getItem('loginCredentials');
    return stored ? JSON.parse(stored) : null;
  });

  const {
    login,
    verify2FA,
    resendLoginOTP,
    isAuthenticated,
    requiresTwoFactor,
    requiresEmailOTP,
    isLoading
  } = useAuth();

  // Debug auth state changes
  useEffect(() => {
    console.log('🔄 Auth state changed:', {
      isAuthenticated,
      requiresTwoFactor,
      requiresEmailOTP,
      isLoading
    });
  }, [isAuthenticated, requiresTwoFactor, requiresEmailOTP, isLoading]);
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !requiresTwoFactor && !requiresEmailOTP) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, requiresTwoFactor, requiresEmailOTP, navigate, location]);



  // Store credentials in sessionStorage when they change
  useEffect(() => {
    if (storedCredentials) {
      console.log('💾 Saving credentials to sessionStorage');
      sessionStorage.setItem('loginCredentials', JSON.stringify(storedCredentials));
    }
  }, [storedCredentials]);

  // Only clear credentials when user successfully logs in or navigates away from login
  useEffect(() => {
    // Clear credentials only when user is fully authenticated
    if (isAuthenticated && !requiresEmailOTP && !requiresTwoFactor) {
      console.log('🧹 Login successful - clearing stored credentials');
      setStoredCredentials(null);
      sessionStorage.removeItem('loginCredentials');
    }
  }, [isAuthenticated, requiresEmailOTP, requiresTwoFactor]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (requiresTwoFactor) {
        // Handle 2FA verification
        if (!formData.twoFactorCode) {
          toast.error('Please enter your 2FA code');
          return;
        }

        await verify2FA(formData.twoFactorCode);
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      } else if (requiresEmailOTP) {
        // Handle email OTP verification
        if (!formData.emailOTP) {
          toast.error('Please enter the verification code from your email');
          return;
        }

        // Get credentials from state or sessionStorage
        let credentials = storedCredentials;
        if (!credentials) {
          const sessionCreds = sessionStorage.getItem('loginCredentials');
          if (sessionCreds) {
            credentials = JSON.parse(sessionCreds);
            setStoredCredentials(credentials);
            console.log('🔄 Restored credentials from sessionStorage');
          }
        }

        console.log('🔍 Checking credentials:', credentials ? 'Found' : 'Not found');
        if (!credentials) {
          console.log('❌ No stored credentials found');
          toast.error('Session expired. Please start over.');
          // Reset the form and clear session
          setFormData({
            email: '',
            password: '',
            emailOTP: '',
            twoFactorCode: '',
          });
          sessionStorage.removeItem('loginCredentials');
          return;
        }
        console.log('✅ Using credentials for OTP verification:', { email: credentials.email });

        // Use recovered credentials for OTP verification
        const result = await login({
          email: credentials.email,
          password: credentials.password,
          emailOTP: formData.emailOTP,
        });

        if (result.requiresTwoFactor) {
          // If 2FA is required after email OTP, the component will re-render
          return;
        }

        if (!result.requiresTwoFactor && !result.requiresEmailOTP) {
          const from = location.state?.from?.pathname || '/';
          navigate(from, { replace: true });
        }
      } else {
        // Handle initial login (email + password)
        const credentials = {
          email: formData.email,
          password: formData.password,
        };

        // Store credentials for later OTP verification BEFORE making the request
        console.log('💾 Storing credentials for OTP verification:', { email: credentials.email });
        setStoredCredentials(credentials);

        // Also store immediately in sessionStorage as backup
        sessionStorage.setItem('loginCredentials', JSON.stringify(credentials));
        console.log('💾 Credentials stored in sessionStorage');

        const result = await login(credentials);

        if (!result.requiresTwoFactor && !result.requiresEmailOTP) {
          const from = location.state?.from?.pathname || '/';
          navigate(from, { replace: true });
        }
        // If email OTP or 2FA is required, the component will re-render
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      // Get email from stored credentials or sessionStorage
      let email = storedCredentials?.email;
      if (!email) {
        const sessionCreds = sessionStorage.getItem('loginCredentials');
        if (sessionCreds) {
          email = JSON.parse(sessionCreds).email;
        }
      }
      email = email || formData.email;

      console.log('📧 Resending OTP to:', email);
      await resendLoginOTP(email);
    } catch (error) {
      console.error('Resend OTP error:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            {requiresTwoFactor
              ? 'Two-Factor Authentication'
              : requiresEmailOTP
                ? 'Email Verification'
                : 'Sign in to your account'
            }
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-300">
            {requiresTwoFactor ? (
              'Enter the verification code from your authenticator app'
            ) : requiresEmailOTP ? (
              <>
                Enter the 6-digit verification code sent to{' '}
                <span className="font-medium text-blue-600">
                  {storedCredentials?.email || formData.email}
                </span>
              </>
            ) : (
              <>
                Or{' '}
                <Link
                  to="/register"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  create a new account
                </Link>
              </>
            )}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {!requiresTwoFactor && !requiresEmailOTP ? (
            <>
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="sr-only">
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="appearance-none rounded-md relative block w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Email address"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="appearance-none rounded-md relative block w-full px-3 py-2 pl-10 pr-10 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : requiresEmailOTP ? (
            /* Email OTP Code Field */
            <div>
              <label htmlFor="emailOTP" className="sr-only">
                Email Verification Code
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="emailOTP"
                  name="emailOTP"
                  type="text"
                  autoComplete="one-time-code"
                  required
                  value={formData.emailOTP}
                  onChange={handleInputChange}
                  className="appearance-none rounded-md relative block w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Enter 6-digit code"
                  maxLength="6"
                />
              </div>
            </div>
          ) : (
            /* 2FA Code Field */
            <div>
              <label htmlFor="twoFactorCode" className="sr-only">
                Two-Factor Authentication Code
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Shield className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="twoFactorCode"
                  name="twoFactorCode"
                  type="text"
                  autoComplete="one-time-code"
                  required
                  value={formData.twoFactorCode}
                  onChange={handleInputChange}
                  className="appearance-none rounded-md relative block w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Enter 6-digit code"
                  maxLength="6"
                />
              </div>
            </div>
          )}

          {!requiresTwoFactor && !requiresEmailOTP && (
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <Link
                  to="/forgot-password"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Forgot your password?
                </Link>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {requiresTwoFactor
                    ? 'Verifying 2FA...'
                    : requiresEmailOTP
                      ? 'Verifying Code...'
                      : 'Signing in...'
                  }
                </div>
              ) : (
                requiresTwoFactor
                  ? 'Verify 2FA Code'
                  : requiresEmailOTP
                    ? 'Verify Email Code'
                    : 'Sign in'
              )}
            </button>
          </div>

          {requiresEmailOTP && (
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Didn't receive the code?{' '}
                <button
                  type="button"
                  onClick={handleResendOTP}
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Resend Code
                </button>
              </p>
            </div>
          )}

          {requiresTwoFactor && (
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Can't access your authenticator app?{' '}
                <Link
                  to="/2fa-backup"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Use backup code
                </Link>
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
