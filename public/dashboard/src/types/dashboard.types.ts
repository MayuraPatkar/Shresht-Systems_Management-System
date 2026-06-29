/**
 * Dashboard Module Types
 */

interface MorningBriefData {
  outOfStockCount: number;
  lowStockCount: number;
  potentialSalesCost: number;
  revenue: number;
  expenses: number;
  revenueLastMonth: number;
  quotationsGiven: number;
  activeProjects: number;
  outstandingAmount: number;
  totalCustomers: number;
}

interface OverviewData {
    totalProjects: number;
    totalQuotations: number;
    totalEarned: number;
    totalUnpaid: number;
    totalExpenditure: number;
    remainingServices: number;
    totalCustomers: number;
}

interface MetricData {
    current: number;
    previous: number;
}

interface PerformanceMetrics {
    revenue?: MetricData;
    projects?: MetricData;
    quotations?: MetricData;
}

interface ActivityItem {
    type: string;
    icon: string;
    color: string;
    title: string;
    description: string;
    time: string | Date;
    link: string;
}

interface TaskItem {
    icon: string;
    color: string;
    title: string;
    count: number;
    description: string;
    link: string;
}
