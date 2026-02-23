import React, { useState, useEffect } from 'react';
import Components from "@/components";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, GraduationCap, School, TrendingUp, Loader2 } from "lucide-react";
import { analyticsService } from '@/services/analytics.service';

export default function ManagementOverview() {
  const [overview, setOverview] = useState<{
    totalEnrolment?: number;
    avgAttendance?: number;
    activeCourses?: number;
    staffPresent?: number;
    strategicGoals?: Array<{ name: string; progress: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await analyticsService.getManagementOverview();
      setOverview(data);
    } catch (error) {
      console.error('Error loading management overview:', error);
      setOverview(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [retryCount]);

  return (
    <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Management Overview</h1>
          <p className="text-gray-500">Executive summary of institutional performance.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           <Card className="border-l-4 border-l-[#015F2B]">
             <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Enrolment</p>
                    <h3 className="text-3xl font-bold">
                      {loading ? <Loader2 className="h-8 w-8 animate-spin text-gray-400" /> : (overview?.totalEnrolment?.toLocaleString() ?? '—')}
                    </h3>
                  </div>
                  <Users className="h-8 w-8 text-[#015F2B] opacity-20" />
                </div>
                <div className="mt-4 flex items-center text-sm text-gray-500">
                   Active students
                </div>
             </CardContent>
           </Card>
           
           <Card className="border-l-4 border-l-[#F6A000]">
             <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Avg. Attendance</p>
                    <h3 className="text-3xl font-bold">
                      {loading ? <Loader2 className="h-8 w-8 animate-spin text-gray-400" /> : (overview?.avgAttendance != null ? `${overview.avgAttendance.toFixed(1)}%` : '—')}
                    </h3>
                  </div>
                  <GraduationCap className="h-8 w-8 text-[#F6A000] opacity-20" />
                </div>
                <div className="mt-4 flex items-center text-sm text-gray-500">
                   Student attendance rate
                </div>
             </CardContent>
           </Card>

           <Card className="border-l-4 border-l-blue-600">
             <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Active Courses</p>
                    <h3 className="text-3xl font-bold">
                      {loading ? <Loader2 className="h-8 w-8 animate-spin text-gray-400" /> : (overview?.activeCourses?.toLocaleString() ?? '—')}
                    </h3>
                  </div>
                  <School className="h-8 w-8 text-blue-600 opacity-20" />
                </div>
                <div className="mt-4 flex items-center text-sm text-gray-500">
                   Total courses
                </div>
             </CardContent>
           </Card>

           <Card className="border-l-4 border-l-purple-600">
             <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Staff Present</p>
                    <h3 className="text-3xl font-bold">
                      {loading ? <Loader2 className="h-8 w-8 animate-spin text-gray-400" /> : (overview?.staffPresent != null ? `${overview.staffPresent}%` : '—')}
                    </h3>
                  </div>
                  <Users className="h-8 w-8 text-purple-600 opacity-20" />
                </div>
                <div className="mt-4 flex items-center text-sm text-gray-500">
                   Staff attendance
                </div>
             </CardContent>
           </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <Card>
              <CardHeader>
                <CardTitle>Strategic Goals Progress</CardTitle>
                <CardDescription>
                  {(() => {
                    const now = new Date();
                    const quarter = Math.floor(now.getMonth() / 3) + 1;
                    const year = now.getFullYear();
                    return `Q${quarter} ${year} Objectives`;
                  })()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : overview?.strategicGoals && overview.strategicGoals.length > 0 ? (
                  overview.strategicGoals.map((goal, idx) => {
                    const colors = ['bg-[#015F2B]', 'bg-[#F6A000]', 'bg-blue-600'];
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{goal.name}</span>
                          <span className="font-bold">{goal.progress}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${colors[idx % colors.length]} transition-all`} style={{ width: `${goal.progress}%` }}></div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 space-y-2">
                    <div className="text-gray-400 text-sm">No strategic goals data available</div>
                    <Button variant="outline" size="sm" onClick={() => setRetryCount(prev => prev + 1)}>
                      Retry
                    </Button>
                  </div>
                )}
              </CardContent>
           </Card>
        </div>
      </div>
  );
}
