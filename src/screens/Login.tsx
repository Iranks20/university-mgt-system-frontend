import React, { useState, useEffect } from 'react';
import { 
  User, Lock, ArrowRight, 
  School, GraduationCap 
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Link } from '@/lib';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studentId, setStudentId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await login(email, password);
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
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await login('', password, studentId);
      toast.success('Login successful! Welcome back.');
      navigate('/dashboard');
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Login failed. Please check your credentials.';
      setError(errorMessage);
      
      if (err?.response?.data?.code === 'STUDENT_NOT_FOUND') {
        toast.error('No student found with this ID or email');
      } else if (err?.response?.data?.code === 'ACCOUNT_NOT_LINKED') {
        toast.error('Student account not linked. Please contact administrator.');
      } else if (err?.response?.data?.code === 'INVALID_PASSWORD') {
        toast.error('Incorrect password. Please try again.');
      } else if (err?.response?.data?.code === 'ACCOUNT_INACTIVE') {
        toast.error('Your account is inactive. Please contact administrator.');
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
            <Tabs defaultValue="staff" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100">
                <TabsTrigger value="staff">Staff & Admin</TabsTrigger>
                <TabsTrigger value="student">Student</TabsTrigger>
              </TabsList>
              
              <TabsContent value="staff">
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                    {error}
                  </div>
                )}
                <form onSubmit={handleStaffLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="staff-email">University Email</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input 
                        id="staff-email" 
                        placeholder="name@kcu.ac.ug" 
                        type="email" 
                        className="pl-10"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="staff-password">Password</Label>
                      <Link to="#" className="text-sm font-medium text-[#015F2B] hover:underline">
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input 
                        id="staff-password" 
                        type="password" 
                        className="pl-10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required 
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="remember" />
                    <label
                      htmlFor="remember"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Remember me
                    </label>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-[#015F2B] hover:bg-[#014022] h-11 text-base" 
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing in...' : 'Sign In'}
                    {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="student">
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                    {error}
                  </div>
                )}
                <form onSubmit={handleStudentLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="student-id">Student ID / Reg Number</Label>
                    <div className="relative">
                      <GraduationCap className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input 
                        id="student-id" 
                        placeholder="e.g. 21/KCU/001" 
                        className="pl-10"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        required 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                     <div className="flex items-center justify-between">
                      <Label htmlFor="student-password">Password</Label>
                      <Link to="#" className="text-sm font-medium text-[#015F2B] hover:underline">
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input 
                        id="student-password" 
                        type="password" 
                        className="pl-10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required 
                      />
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-[#015F2B] hover:bg-[#014022] h-11 text-base"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Signing in...' : 'Student Login'}
                    {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                </form>
               </TabsContent>
            </Tabs>
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
