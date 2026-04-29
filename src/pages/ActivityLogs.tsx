"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, AlertTriangle, FilterX } from "lucide-react";
import { useProfile, UserProfile } from "@/context/ProfileContext";
import { supabase } from "@/lib/supabaseClient";
import { showError } from "@/utils/toast";
import { format, isValid, startOfDay, endOfDay } from "date-fns";
import { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/DateRangePicker";
import { parseAndValidateDate } from "@/utils/dateUtils";

interface ActivityLog {
  id: string;
  timestamp: string;
  userId: string;
  organizationId: string;
  activityType: string;
  description: string;
  details: any;
}

const ITEMS_PER_PAGE = 10;

const ActivityLogs: React.FC = () => {
  const { profile, isLoadingProfile, allProfiles, fetchAllProfiles } = useProfile();
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(0);

  const isAdmin = profile?.role === 'admin';

  const fetchActivityLogs = useCallback(async () => {
    if (!profile?.organizationId || !isAdmin) {
      setActivityLogs([]);
      setIsLoadingLogs(false);
      return;
    }

    setIsLoadingLogs(true);
    setError(null);

    let query = supabase
      .from('activity_logs')
      .select('*')
      .eq('organization_id', profile.organizationId)
      .order('timestamp', { ascending: false });

    const filterFrom = (dateRange?.from && isValid(dateRange.from)) ? startOfDay(dateRange.from) : null;
    const filterTo = (dateRange?.to && isValid(dateRange.to)) ? endOfDay(dateRange.to) : ((dateRange?.from && isValid(dateRange.from)) ? endOfDay(dateRange.from) : null);

    if (filterFrom && filterTo) {
      query = query.gte('timestamp', filterFrom.toISOString()).lte('timestamp', filterTo.toISOString());
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      console.error("Error fetching activity logs:", fetchError);
      showError("Failed to load activity logs.");
      setError(fetchError.message);
      setActivityLogs([]);
    } else {
      const mappedLogs: ActivityLog[] = data.map((log: any) => ({
        id: log.id,
        timestamp: parseAndValidateDate(log.timestamp)?.toISOString() || new Date().toISOString(),
        userId: log.user_id,
        organizationId: log.organization_id,
        activityType: log.activity_type,
        description: log.description,
        details: log.details,
      }));
      setActivityLogs(mappedLogs);
    }
    setIsLoadingLogs(false);
  }, [profile?.organizationId, isAdmin, dateRange]);

  useEffect(() => {
    if (!isLoadingProfile && isAdmin) {
      fetchActivityLogs();
      fetchAllProfiles();
    } else if (!isLoadingProfile && !isAdmin) {
      setIsLoadingLogs(false);
    }
  }, [isLoadingProfile, isAdmin, fetchActivityLogs, fetchAllProfiles]);

  useEffect(() => {
    setCurrentPage(0); // Reset to first page when filters change
  }, [dateRange, activityLogs]);

  const getUserName = (userId: string) => {
    const user = allProfiles.find((p: UserProfile) => p.id === userId);
    return user?.fullName || user?.email || "Unknown User";
  };

  const paginatedLogs = useMemo(() => {
    const startIndex = currentPage * ITEMS_PER_PAGE;
    return activityLogs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [activityLogs, currentPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(activityLogs.length / ITEMS_PER_PAGE);
  }, [activityLogs]);

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1));
  };

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 0));
  };

  const handleClearDateFilter = () => {
    setDateRange(undefined);
  };

  if (isLoadingProfile || isLoadingLogs) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading activity logs...</span>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="p-6 text-center bg-card border-border">
          <CardTitle className="text-2xl font-bold mb-4">Access Denied</CardTitle>
          <CardContent>
            <p className="text-muted-foreground">You do not have administrative privileges to view this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 flex flex-col flex-grow">
      <h1 className="text-3xl font-bold">Activity Logs</h1>
      <p className="text-muted-foreground">
        View all user activities within your organization. Only visible to administrators.
      </p>

      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-semibold">Log Filters</CardTitle>
          <div className="flex items-center gap-2">
            <DateRangePicker dateRange={dateRange} onSelect={setDateRange} className="w-[240px]" />
            {dateRange?.from && isValid(dateRange.from) && (
              <Button variant="outline" onClick={handleClearDateFilter} size="icon">
                <FilterX className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      <Card className="bg-card border-border rounded-lg shadow-sm p-6 flex flex-col flex-grow">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold">Recent Activities</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col">
          {error ? (
            <div className="flex flex-col items-center justify-center h-full text-destructive">
              <AlertTriangle className="h-16 w-16 mb-4" />
              <p className="text-lg">Error: {error}</p>
              <Button onClick={fetchActivityLogs} className="mt-4">Retry Loading Logs</Button>
            </div>
          ) : activityLogs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No activity logs found for the selected period.</p>
          ) : (
            <>
              <ScrollArea className="flex-grow border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Timestamp</TableHead>
                      <TableHead className="w-[150px]">User</TableHead>
                      <TableHead className="w-[180px]">Activity Type</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{format(parseAndValidateDate(log.timestamp) || new Date(), "MMM dd, yyyy HH:mm")}</TableCell>
                        <TableCell>{getUserName(log.userId)}</TableCell>
                        <TableCell className="font-medium">{log.activityType}</TableCell>
                        <TableCell>{log.description}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              <div className="flex justify-between items-center mt-4">
                <Button
                  variant="outline"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 0}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage + 1} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages - 1}
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityLogs;