import React, { useState, useEffect } from 'react';
import {
  User,
  Lock,
  ArrowRight,
  School,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Link } from '@/lib';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

function LoginContent() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setError('Please enter your email or student ID and password.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const value = identifier.trim();
      const isEmail = value.includes('@');
      if (isEmail) {
        await login(value, password);
      } else {
        await login('', password, value);
      }
      toast.success('Login successful! Welcome back.');
      navigate('/dashboard');
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Login failed. Please check your credentials.';
      setError(errorMessage);
      
      if (err?.response?.data?.code === 'EMAIL_NOT_FOUND') {
        toast.error('No account found with this email address');
      } else if (err?.response?.data?.code === 'INVALID_PASSWORD') {
        toast.error('Incorrect password. Please try again.');
      } else if (err?.response?.data?.code === 'ACCOUNT_INACTIVE') {
        toast.error('Your account is inactive. Please contact administrator.');
      } else if (err?.response?.data?.code === 'STUDENT_NOT_FOUND') {
        toast.error('No student found with this ID or email');
      } else if (err?.response?.data?.code === 'ACCOUNT_NOT_LINKED') {
        toast.error('Student account not linked. Please contact administrator.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="bg-[#015F2B] w-16 h-16 rounded-xl mx-auto flex items-center justify-center shadow-lg">
            <School className="text-white h-10 w-10" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">King Ceasor University</h1>
          <p className="text-gray-500">Quality Assurance & Attendance System</p>
        </div>

        <Card className="border-t-4 border-t-[#015F2B] shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Sign in</CardTitle>
            <CardDescription className="text-center">
              Enter your university credentials to access the portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {error}
              </div>
            )}
            <form onSubmit={handleLogin} className="space-y-4" data-testid="login-form">
              <div className="space-y-2">
                <Label htmlFor="identifier">University Email or Student ID</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="identifier"
                    data-testid="login-email-input"
                    placeholder="name@kcu.ac.ug or 21/KCU/001"
                    className="pl-10"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link to="#" className="text-sm font-medium text-[#015F2B] hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    data-testid="login-password-input"
                    type={showPassword ? 'text' : 'password'}
                    className="pl-10 pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(prev => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                data-testid="login-signin-button"
                className="w-full bg-[#015F2B] hover:bg-[#014022] h-11 text-base"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
                {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 bg-gray-50/50 border-t items-center text-center p-6">
            <div className="text-sm text-gray-500">
              Need help accessing your account? <br />
              Contact IT Support at <a href="mailto:support@kcu.ac.ug" className="text-[#015F2B] font-medium">support@kcu.ac.ug</a>
            </div>
          </CardFooter>
        </Card>
        
        <div className="text-center text-xs text-gray-400">
          &copy; {new Date().getFullYear()} King Ceasor University. All rights reserved.
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  return <LoginContent />;
}
