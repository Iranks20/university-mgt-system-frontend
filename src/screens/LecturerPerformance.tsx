import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Award, Clock, Star, ThumbsUp, Loader2 } from "lucide-react";
import { staffService } from '@/services/staff.service';
import { analyticsService } from '@/services/analytics.service';
import { useAuth } from '@/contexts/AuthContext';

export default function LecturerPerformance() {
  const { user } = useAuth();
  const [stats, setStats] = useState<{ teachingRate?: number; classesTaught?: number } | null>(null);
  const [perf, setPerf] = useState<{ attendanceRate?: number; taught?: number } | null>(null);
  const [studentRating, setStudentRating] = useState<{ rating: number; maxRating: number; totalRatings: number } | null>(null);
  const [departmentRank, setDepartmentRank] = useState<{ rank: number; totalLecturers: number; performance: number } | null>(null);
  const [qualityTrend, setQualityTrend] = useState<{ month: string; score: number }[]>([]);
  const [complianceTrend, setComplianceTrend] = useState<{ month: string; rate: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  const loadData = async () => {
      setLoading(true);
      try {
        const [dashboardRes, perfRes, ratingRes, rankRes, qualityRes, complianceRes] = await Promise.all([
          staffService.getDashboardStats(),
          user?.id ? analyticsService.getLecturerPerformance() : Promise.resolve(null),
          staffService.getLecturerStudentRating(),
          staffService.getLecturerDepartmentRank(),
          analyticsService.getLecturerQualityTrend(6),
          analyticsService.getLecturerComplianceTrend(6),
        ]);
        setStats((dashboardRes as { teachingRate?: number; classesTaught?: number } | null) || null);
        const data = perfRes && typeof perfRes === 'object' && !Array.isArray(perfRes) ? perfRes as any : null;
        setPerf(data?.attendanceRate != null ? { attendanceRate: data.attendanceRate, taught: data.taught } : null);
        setStudentRating(ratingRes);
        setDepartmentRank(rankRes);
        setQualityTrend(Array.isArray(qualityRes) ? qualityRes : []);
        setComplianceTrend(Array.isArray(complianceRes) ? complianceRes : []);
      } catch (e) {
        console.error('Error loading lecturer performance:', e);
        setStats(null);
        setPerf(null);
        setStudentRating(null);
        setDepartmentRank(null);
        setQualityTrend([]);
        setComplianceTrend([]);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadData();
  }, [user?.id, retryCount]);

  const teachingRate = perf?.attendanceRate ?? stats?.teachingRate ?? 0;
  const classesTaught = perf?.taught ?? stats?.classesTaught ?? 0;
  const chartData = qualityTrend.length > 0 ? qualityTrend : [];
  const complianceData = complianceTrend.length > 0 
    ? complianceTrend.map(t => ({ course: t.month, rate: t.rate }))
    : (perf?.attendanceRate != null ? [{ course: 'Teaching', rate: perf.attendanceRate }] : []);

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">My Performance</h1>
          <p className="text-gray-500">Analytics on your teaching effectiveness and attendance compliance.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <Card>
             <CardContent className="pt-6 flex flex-col items-center text-center">
               <div className="p-3 bg-green-100 rounded-full mb-3">
                 <Star className="h-6 w-6 text-[#015F2B]" />
               </div>
               <p className="text-3xl font-bold text-gray-900">
                 {loading ? <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" /> : 
                  studentRating ? `${studentRating.rating}/${studentRating.maxRating}` : '—'}
               </p>
               <p className="text-sm text-gray-500">
                 {studentRating ? `Student Rating (${studentRating.totalRatings} reviews)` : 'Student Rating'}
               </p>
             </CardContent>
           </Card>
           <Card>
             <CardContent className="pt-6 flex flex-col items-center text-center">
               <div className="p-3 bg-blue-100 rounded-full mb-3">
                 <Clock className="h-6 w-6 text-blue-600" />
               </div>
               <p className="text-3xl font-bold text-gray-900">{loading ? '—' : (teachingRate + '%')}</p>
               <p className="text-sm text-gray-500">Teaching / Punctuality</p>
             </CardContent>
           </Card>
           <Card>
             <CardContent className="pt-6 flex flex-col items-center text-center">
               <div className="p-3 bg-orange-100 rounded-full mb-3">
                 <Award className="h-6 w-6 text-orange-600" />
               </div>
               <p className="text-3xl font-bold text-gray-900">
                 {loading ? <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" /> : 
                  departmentRank ? `#${departmentRank.rank}/${departmentRank.totalLecturers}` : '—'}
               </p>
               <p className="text-sm text-gray-500">
                 {departmentRank ? `Department Rank (${departmentRank.performance.toFixed(1)}% perf)` : 'Department Rank'}
               </p>
             </CardContent>
           </Card>
           <Card>
             <CardContent className="pt-6 flex flex-col items-center text-center">
               <div className="p-3 bg-purple-100 rounded-full mb-3">
                 <ThumbsUp className="h-6 w-6 text-purple-600" />
               </div>
               <p className="text-3xl font-bold text-gray-900">{loading ? '—' : classesTaught}</p>
               <p className="text-sm text-gray-500">Classes Taught</p>
             </CardContent>
           </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Teaching Quality Trend</CardTitle>
              <CardDescription>Based on teaching compliance.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" stroke="#015F2B" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                  No quality trend data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attendance Compliance</CardTitle>
              <CardDescription>Your teaching rate.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : complianceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={complianceData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis dataKey="course" type="category" axisLine={false} tickLine={false} width={80} />
                    <Tooltip />
                    <Bar dataKey="rate" fill="#F6A000" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm space-y-2">
                  <div>No compliance data available</div>
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
