import React, { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import TimesheetDashboardWidget from '@/components/timesheets/TimesheetDashboardWidget';
import {
  RefreshCw, BarChart3, Download, Users, Activity, UserPlus, DollarSign,
  FolderOpen, CheckSquare, Clock, Bug, Receipt, FileText, Building2,
  TrendingUp, AlertTriangle, Calendar, Target, Wallet, CreditCard, Ticket, X,
  Settings as SettingsIcon, Globe, Shield
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/utils/currency';
import { Link, useForm, usePage } from '@inertiajs/react';

interface DashboardData {
  cards: Array<{
    value: number;
  }>;
  projects?: {
    total: number;
    active: number;
    completed: number;
    overdue: number;
  };
  tasks?: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
  };
  timesheets?: {
    totalHours: number;
    thisWeek: number;
    pendingApprovals: number;
  };
  budgets?: {
    totalBudget: number;
    spent: number;
    remaining: number;
    utilization: number;
  };
  invoices?: {
    total: number;
    paid: number;
    pending: number;
    overdue: number;
  };
  bugs?: {
    total: number;
    open: number;
    resolved: number;
    critical: number;
  };
  recentActivities?: Array<{
    id: number;
    type: string;
    description: string;
    user: string;
    time: string;
  }>;
  recentCompanies?: Array<{
    id: number;
    name: string;
    email: string;
    plan?: string;
    registered_at: string;
  }>;
}

interface PageAction {
  label: string;
  icon: React.ReactNode;
  variant: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  onClick: () => void;
}

export default function Dashboard({ dashboardData, isSuperAdmin, isSaasMode = true, hasRoleDashboardAccess = false, userWorkspaceRole }: { dashboardData: DashboardData; isSuperAdmin?: boolean; isSaasMode?: boolean; hasRoleDashboardAccess?: boolean; userWorkspaceRole?: string }) {
  const { t } = useTranslation();
  const { auth } = usePage().props as any;
  // If super admin, render super admin dashboard
  if (isSuperAdmin) {
    return (
      <PageTemplate
        title={t('Dashboard')}
        url="/dashboard"
        actions={[
          {
            label: t('Refresh'),
            icon: <RefreshCw className="h-4 w-4" />,
            variant: 'outline',
            onClick: () => window.location.reload()
          }
        ]}
      >
        <div className="space-y-6">
          {/* Main Stats Cards */}
          <div className={`grid gap-4 ${isSaasMode ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
            <Card className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t('Total Companies')}</p>
                    <h3 className="mt-2 text-3xl font-bold">{(dashboardData?.cards?.[0]?.value ?? 0).toLocaleString()}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {dashboardData?.companies?.active ?? 0} {t('Active')}, {dashboardData?.companies?.inactive ?? 0} {t('Inactive')}
                    </p>
                  </div>
                  <div className="rounded-full bg-blue-100 dark:bg-blue-900/20 p-3">
                    <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {!isSaasMode && (
              <Card className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('Total Projects')}</p>
                      <h3 className="mt-2 text-3xl font-bold">{(dashboardData?.projects?.total ?? 0).toLocaleString()}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {dashboardData?.projects?.active ?? 0} {t('Active Projects')}
                      </p>
                    </div>
                    <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3">
                      <FolderOpen className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {!isSaasMode && (
              <Card className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('System Users')}</p>
                      <h3 className="mt-2 text-3xl font-bold">{(dashboardData?.users?.total ?? 0).toLocaleString()}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('Across all companies')}
                      </p>
                    </div>
                    <div className="rounded-full bg-purple-100 dark:bg-purple-900/20 p-3">
                      <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {isSaasMode && (
              <Card className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('Total Plans')}</p>
                      <h3 className="mt-2 text-3xl font-bold">{(dashboardData?.cards?.[1]?.value ?? 0).toLocaleString()}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {dashboardData?.plans?.active ?? 0} {t('Active')}, {dashboardData?.plans?.inactive ?? 0} {t('Inactive')}
                      </p>
                    </div>
                    <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3">
                      <CreditCard className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {isSaasMode && (
              <Card className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{t('Plan Orders')}</p>
                      <h3 className="mt-2 text-3xl font-bold">{(dashboardData?.cards?.[2]?.value ?? 0).toLocaleString()}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {dashboardData?.planOrders?.pending ?? 0} {t('Pending Approvals')}
                      </p>
                    </div>
                    <div className="rounded-full bg-purple-100 dark:bg-purple-900/20 p-3">
                      <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* {isSaasMode && (
              <Card className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Coupons</p>
                      <h3 className="mt-2 text-3xl font-bold">{(dashboardData?.coupons?.total ?? 0).toLocaleString()}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {dashboardData?.coupons?.active ?? 0} {t('Active')}, {dashboardData?.coupons?.expired ?? 0} {t('Inactive')}
                      </p>
                    </div>
                    <div className="rounded-full bg-yellow-100 dark:bg-yellow-900/20 p-3">
                      <Ticket className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )} */}

          </div>

          {/* Module Cards */}
          {isSaasMode ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <FileText className="h-5 w-5" />
                    {t('Plan Orders')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('Pending')}</span>
                    <Badge variant={(dashboardData?.planOrders?.pending ?? 0) > 0 ? "destructive" : "secondary"}>
                      {dashboardData?.planOrders?.pending ?? 0}
                    </Badge>
                  </div>
                  <Link href={route('plan-orders.index')} className="block">
                    <div className="text-xs text-primary hover:underline mt-2">{t('Manage Orders')} →</div>
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <Clock className="h-5 w-5" />
                    {t('Plan Requests')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('Pending')}</span>
                    <Badge variant={(dashboardData?.planRequests?.pending ?? 0) > 0 ? "destructive" : "secondary"}>
                      {dashboardData?.planRequests?.pending ?? 0}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('Approved')}</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                      {dashboardData?.planRequests?.approved ?? 0}
                    </Badge>
                  </div>
                  <Link href={route('plan-requests.index')} className="block">
                    <div className="text-xs text-primary hover:underline mt-2">{t('Manage Requests')} →</div>
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <Ticket className="h-5 w-5" />
                    {t('Coupons')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('Inactive')}</span>
                    <Badge variant={(dashboardData?.coupons?.expired ?? 0) > 0 ? "destructive" : "secondary"}>
                      {dashboardData?.coupons?.expired ?? 0}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('Active')}</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                      {dashboardData?.coupons?.active ?? 0}
                    </Badge>
                  </div>
                  <Link href={route('coupons.index')} className="block">
                    <div className="text-xs text-primary hover:underline mt-2">{t('Manage Coupons')} →</div>
                  </Link>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <SettingsIcon className="h-5 w-5" />
                    {t('System Management')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('Companies')}</span>
                    <Badge variant="secondary">
                      {dashboardData?.companies?.total ?? 0}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('Active')}</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                      {dashboardData?.companies?.active ?? 0}
                    </Badge>
                  </div>
                  <Link href={route('companies.index')} className="block">
                    <div className="text-xs text-primary hover:underline mt-2">{t('Manage Companies')} →</div>
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <DollarSign className="h-5 w-5" />
                    {t('Currencies')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('Available')}</span>
                    <Badge variant="secondary">
                      {dashboardData?.currencies?.total ?? 0}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('Default')}</span>
                    <span className="font-semibold">{dashboardData?.currencies?.default ?? 'USD'}</span>
                  </div>
                  <Link href={route('currencies.index')} className="block">
                    <div className="text-xs text-primary hover:underline mt-2">{t('Manage Currencies')} →</div>
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <Globe className="h-5 w-5" />
                    {t('Landing Page')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('Status')}</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                      {t('Active')}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('Custom Pages')}</span>
                    <span className="font-semibold">{dashboardData?.customPages?.total ?? 0}</span>
                  </div>
                  <Link href={route('landing-page')} className="block">
                    <div className="text-xs text-primary hover:underline mt-2">{t('Manage Landing Page')} →</div>
                  </Link>
                </CardContent>
              </Card>
            </div>
          )}

          {/* System Overview Section */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-6 w-6" />
                    <span className="text-xl font-bold">{t('System Overview')}</span>
                  </div>
                  <Badge variant="outline" className="text-xs font-medium">
                    {t('Live Data')}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">

                  {dashboardData?.recentCompanies && dashboardData.recentCompanies.length > 0 && (
                    <div className="space-y-2 pb-4 border-b">
                      <h4 className="text-base font-semibold text-foreground mb-1">{t('Recently Registered Companies')}</h4>
                      <div className="space-y-2">
                        {dashboardData.recentCompanies.slice(0, 3).map((company: any) => (
                          <div key={company.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full" />
                              <div>
                                <p className="text-sm font-medium">{company.name}</p>
                                <p className="text-xs text-muted-foreground">{company.email}</p>
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground">{company.registered_at}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {isSaasMode && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <h4 className="text-base font-semibold text-foreground mb-1">{t('Most Bought Plan')}</h4>
                        <div className="p-3 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10">
                          {dashboardData?.mostBoughtPlan ? (
                            <>
                              <p className="font-semibold text-blue-900 dark:text-blue-100">{dashboardData.mostBoughtPlan.name}</p>
                              <p className="text-sm text-blue-700 dark:text-blue-300">{dashboardData.mostBoughtPlan.count} {t('Orders')}</p>
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">{t('No data available')}</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-base font-semibold text-foreground mb-1">{t('Most Used Coupon')}</h4>
                        <div className="p-3 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10">
                          {dashboardData?.mostUsedCoupon ? (
                            <>
                              <p className="font-semibold text-green-900 dark:text-green-100">{dashboardData.mostUsedCoupon.name}</p>
                              <p className="text-sm text-green-700 dark:text-green-300">{dashboardData.mostUsedCoupon.code} • {dashboardData.mostUsedCoupon.count} {t('Uses')}</p>
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">{t('No data available')}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3 pt-2 border-t">
                    <Link href={route('companies.index')} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                      <Building2 className="h-3 w-3" />
                      {t('Manage Companies')}
                    </Link>
                    {isSaasMode && (
                      <Link href={route('plans.index')} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                        <CreditCard className="h-3 w-3" />
                        {t('Manage Plans')}
                      </Link>
                    )}
                    {isSaasMode && (
                      <Link href={route('plans.create')} className="inline-flex items-center gap-1 text-sm text-green-600 hover:underline">
                        <Target className="h-3 w-3" />
                        {t('Create Plan')}
                      </Link>
                    )}
                    {!isSaasMode && (
                      <Link href={route('settings')} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                        <SettingsIcon className="h-3 w-3" />
                        {t('System Settings')}
                      </Link>
                    )}
                    {!isSaasMode && (
                      <Link href={route('currencies.index')} className="inline-flex items-center gap-1 text-sm text-green-600 hover:underline">
                        <DollarSign className="h-3 w-3" />
                        {t('Manage Currencies')}
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-6 w-6" />
                  <span className="text-xl font-bold">{t('Recent Activities')}</span>
                </div>
                <Badge variant="outline" className="text-xs font-medium">
                  {t('Live')}
                </Badge>
              </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {(dashboardData?.recentActivities ?? []).length > 0 ? (dashboardData?.recentActivities ?? []).map((activity: any, index: number) => {
                    const getActivityIcon = (type: string) => {
                      switch (type) {
                        case 'plan_order':
                          return <FileText className="h-4 w-4 text-blue-500" />;
                        case 'plan_request':
                          return <Clock className="h-4 w-4 text-yellow-500" />;
                        case 'company_registration':
                          return <Building2 className="h-4 w-4 text-green-500" />;
                        default:
                          return <Activity className="h-4 w-4 text-gray-500" />;
                      }
                    };

                    const getActivityColor = (type: string) => {
                      switch (type) {
                        case 'plan_order':
                          return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10';
                        case 'plan_request':
                          return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10';
                        case 'company_registration':
                          return 'border-l-green-500 bg-green-50 dark:bg-green-900/10';
                        default:
                          return 'border-l-gray-500 bg-gray-50 dark:bg-gray-900/10';
                      }
                    };

                    return (
                      <div key={activity.id} className={`flex items-start gap-3 p-3 rounded-lg border-l-4 ${getActivityColor(activity.type)} transition-all hover:shadow-sm`}>
                        <div className="flex-shrink-0 mt-0.5">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-5 mb-1">{activity.description}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {activity.user}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {activity.time}
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {activity.type?.split('_').map(word => word.charAt(0) + word.slice(1)).join(' ')}
                        </Badge>
                      </div>
                    );
                  }) : (
                    <div className="text-center text-muted-foreground py-8">
                      <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">{t('No recent activities')}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </PageTemplate>
    );
  }

  const pageActions: PageAction[] = [
    {
      label: t('Refresh'),
      icon: <RefreshCw className="h-4 w-4" />,
      variant: 'outline',
      onClick: () => window.location.reload()
    }
  ];

  // Use actual data from backend
  const projects = dashboardData?.projects || { total: 0, active: 0, completed: 0, overdue: 0 };
  const tasks = dashboardData?.tasks || { total: 0, pending: 0, inProgress: 0, completed: 0 };
  const timesheets = dashboardData?.timesheets || { totalHours: 0, thisWeek: 0, pendingApprovals: 0 };
  const budgets = dashboardData?.budgets || { totalBudget: 0, spent: 0, remaining: 0, utilization: 0 };
  const invoices = dashboardData?.invoices || { total: 0, paid: 0, pending: 0, overdue: 0 };
  const recentActivities = dashboardData?.recentActivities || [];

  return (
    <PageTemplate
      title={t('Dashboard')}
      url="/dashboard"
      actions={pageActions}
    >
      <div className="space-y-6">
        {/* Main Stats Cards - Dynamically rendered based on backend */}
        {dashboardData?.cards && dashboardData.cards.length > 0 && (
          <div className={`grid gap-4 md:grid-cols-2 ${dashboardData.cards.length >= 3 ? 'lg:grid-cols-' + Math.min(dashboardData.cards.length, 4) : ''}`}>
            {dashboardData.cards.map((card: any, index: number) => {
              const getCardIcon = (title: string) => {
                if (title.includes('User')) return <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />;
                if (title.includes('Project')) return <FolderOpen className="h-6 w-6 text-green-600 dark:text-green-400" />;
                if (title.includes('Task')) return <CheckSquare className="h-6 w-6 text-purple-600 dark:text-purple-400" />;
                if (title.includes('Revenue')) return <DollarSign className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />;
                return <Activity className="h-6 w-6 text-gray-600 dark:text-gray-400" />;
              };

              const getCardColor = (title: string) => {
                if (title.includes('User')) return 'bg-blue-100 dark:bg-blue-900/20';
                if (title.includes('Project')) return 'bg-green-100 dark:bg-green-900/20';
                if (title.includes('Task')) return 'bg-purple-100 dark:bg-purple-900/20';
                if (title.includes('Revenue')) return 'bg-yellow-100 dark:bg-yellow-900/20';
                return 'bg-gray-100 dark:bg-gray-900/20';
              };

              return (
                <Card key={index} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground tracking-wide">{t(card.title)}</p>
                        <h3 className="mt-2 text-3xl font-bold tracking-tight">
                          {card.format === 'currency' ? formatCurrency(card.value) : card.value.toLocaleString()}
                        </h3>
                      </div>
                      <div className={`rounded-full ${getCardColor(card.title)} p-3`}>
                        {getCardIcon(card.title)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Secondary Stats Grid - Only show if data exists */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Time Tracking */}
          {dashboardData?.timesheets && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <Clock className="h-5 w-5" />
                  {t('Time Tracking')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('This Week')}</span>
                  <span className="font-semibold">{timesheets.thisWeek} {t('h')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('Total Hours')}</span>
                  <span className="font-semibold">{timesheets.totalHours.toLocaleString()} {t('h')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('Pending Approvals')}</span>
                  <Badge variant="secondary">{timesheets.pendingApprovals}</Badge>
                </div>
                <Link href={route('timesheets.index')} className="block">
                  <div className="text-xs text-primary hover:underline mt-2">{t('View Timesheets')} →</div>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Budget Overview */}
          {dashboardData?.budgets && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <Wallet className="h-5 w-5" />
                  {t('Budget Overview')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t('Utilization')}</span>
                    <span className="font-medium">{budgets.utilization} {t('%')}</span>
                  </div>
                  <Progress value={budgets.utilization} className="h-2" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('Spent')}</span>
                  <span className="font-semibold">{formatCurrency(budgets.spent)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t('Remaining')}</span>
                  <span className="font-semibold text-green-600">{formatCurrency(budgets.remaining)}</span>
                </div>
                {auth?.permissions?.includes('budget_dashboard_view') && (
                  <Link href={route('budgets.dashboard')} className="block">
                    <div className="text-xs text-primary hover:underline mt-2">{t('View Budgets')} →</div>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}

          {/* Bug Tracking */}
          {dashboardData?.bugs && dashboardData.bugs.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <Bug className="h-5 w-5" />
                  {t('Bug Tracking')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {dashboardData.bugs.map((bugStatus: any) => (
                    <div key={bugStatus.name} className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{bugStatus.name}</span>
                      <Badge variant="secondary">
                        {bugStatus.count}
                      </Badge>
                    </div>
                  ))}
                </div>
                {auth?.permissions?.includes('bug_view_any') && (
                  <Link href={route('bugs.index')} className="block">
                    <div className="text-xs text-primary hover:underline mt-2">{t('View Bugs')} →</div>
                  </Link>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Dashboard Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Project Status - Only show if data exists */}
          {(dashboardData?.projects || dashboardData?.tasks || dashboardData?.taskStages) && (
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <Target className="h-6 w-6" />
                  {t('Project Status Overview')}
                  {dashboardData?.projects && (
                    <Badge variant="outline" className="text-xs">
                      {projects.total} {t('Total')}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Project Progress Chart */}
                  <div className="grid gap-4 md:grid-cols-2">
                    {dashboardData?.projects && (
                      <div className="space-y-4">
                        <h4 className="text-base font-semibold text-foreground mb-2">{t('Projects')}</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-2 rounded-lg bg-green-50 dark:bg-green-900/10">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-green-500 rounded-full" />
                              <span className="text-sm font-medium">{t('Active')}</span>
                            </div>
                            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                              {projects.active}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center p-2 rounded-lg bg-blue-50 dark:bg-blue-900/10">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-blue-500 rounded-full" />
                              <span className="text-sm font-medium">{t('Completed')}</span>
                            </div>
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                              {projects.completed}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center p-2 rounded-lg bg-red-50 dark:bg-red-900/10">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-red-500 rounded-full" />
                              <span className="text-sm font-medium">{t('Overdue')}</span>
                            </div>
                            <Badge variant={projects.overdue > 0 ? "destructive" : "secondary"}>
                              {projects.overdue}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )}

                    {dashboardData?.taskStages && dashboardData.taskStages.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="text-base font-semibold text-foreground mb-2">{t('Task Stages')}</h4>
                        <div className="space-y-3">
                          {dashboardData.taskStages.map((stage: any, index: number) => {
                            const colors = [
                              { bg: 'bg-blue-50 dark:bg-blue-900/10', dot: 'bg-blue-500', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' },
                              { bg: 'bg-yellow-50 dark:bg-yellow-900/10', dot: 'bg-yellow-500', badge: 'border-yellow-200 text-yellow-800 dark:border-yellow-800 dark:text-yellow-400' },
                              { bg: 'bg-green-50 dark:bg-green-900/10', dot: 'bg-green-500', badge: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' },
                              { bg: 'bg-purple-50 dark:bg-purple-900/10', dot: 'bg-purple-500', badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400' }
                            ];
                            const color = colors[index % colors.length];

                            return (
                              <div key={stage.name} className={`flex justify-between items-center p-2 rounded-lg ${color.bg}`}>
                                <div className="flex items-center gap-2">
                                  <div className={`w-3 h-3 ${color.dot} rounded-full`} />
                                  <span className="text-sm font-medium">{stage.name}</span>
                                </div>
                                <Badge variant={index === 1 ? "outline" : "secondary"} className={color.badge}>
                                  {stage.count}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {dashboardData?.projects && dashboardData?.tasks && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t('Overall Progress')}</span>
                        <span className="font-medium">
                          {(() => {
                            const totalItems = projects.total + tasks.total;
                            const completedItems = projects.completed + tasks.completed;
                            return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
                          })()} {t('%')}
                        </span>
                      </div>
                      <Progress value={(() => {
                        const totalItems = projects.total + tasks.total;
                        const completedItems = projects.completed + tasks.completed;
                        return totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
                      })()} className="h-2" />
                    </div>
                  )}

                  {/* Action Links */}
                  <div className="flex flex-wrap gap-3 pt-2 border-t">
                    {dashboardData?.projects && (
                      <Link href={route('projects.index')} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                        <FolderOpen className="h-3 w-3" />
                        {t('View Projects')}
                      </Link>
                    )}
                    {dashboardData?.tasks && (
                      <Link href={route('tasks.index')} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                        <CheckSquare className="h-3 w-3" />
                        {t('View Tasks')}
                      </Link>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <Activity className="h-6 w-6" />
                  {t('Recent Activities')}
                <Badge variant="outline" className="text-xs font-medium">
                  {t('Live')}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {recentActivities.map((activity, index) => {
                  const getActivityIcon = (type: string) => {
                    switch (type) {
                      case 'task':
                        return <CheckSquare className="h-4 w-4 text-blue-500" />;
                      case 'project':
                        return <FolderOpen className="h-4 w-4 text-green-500" />;
                      case 'expense':
                        return <Receipt className="h-4 w-4 text-yellow-500" />;
                      case 'bug':
                        return <Bug className="h-4 w-4 text-red-500" />;
                      case 'invoice':
                        return <FileText className="h-4 w-4 text-purple-500" />;
                      case 'timesheet':
                        return <Clock className="h-4 w-4 text-indigo-500" />;
                      default:
                        return <Activity className="h-4 w-4 text-gray-500" />;
                    }
                  };

                  const getActivityColor = (type: string) => {
                    switch (type) {
                      case 'task':
                        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10';
                      case 'project':
                        return 'border-l-green-500 bg-green-50 dark:bg-green-900/10';
                      case 'expense':
                        return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10';
                      case 'bug':
                        return 'border-l-red-500 bg-red-50 dark:bg-red-900/10';
                      case 'invoice':
                        return 'border-l-purple-500 bg-purple-50 dark:bg-purple-900/10';
                      case 'timesheet':
                        return 'border-l-indigo-500 bg-indigo-50 dark:bg-indigo-900/10';
                      default:
                        return 'border-l-gray-500 bg-gray-50 dark:bg-gray-900/10';
                    }
                  };

                  return (
                    <div key={activity.id} className={`flex items-start gap-3 p-3 rounded-lg border-l-4 ${getActivityColor(activity.type)} transition-all hover:shadow-sm`}>
                      <div className="flex-shrink-0 mt-0.5">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-5 mb-1">{activity.description}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {activity.user}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {activity.time}
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {activity.type?.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Overview - Only show if data exists */}
        {(dashboardData?.invoices || dashboardData?.expenses) && (
          <div className="grid gap-6 md:grid-cols-2">
            {dashboardData?.invoices && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                    <FileText className="h-5 w-5" />
                    {t('Invoice Status')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{t('Total Invoices')}</span>
                      <span className="font-semibold">{invoices.total}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-600">{t('Paid')}</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">{invoices.paid}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-yellow-600">{t('Pending')}</span>
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">{invoices.pending}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-red-600">{t('Overdue')}</span>
                      <Badge variant="destructive">{invoices.overdue}</Badge>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <Link href={route('invoices.index')} className="text-sm text-primary hover:underline">
                      {t('Manage Invoices')} →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <TrendingUp className="h-5 w-5" />
                  {t('Quick Actions')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {dashboardData?.projects && (
                    <Link href={route('projects.index')} className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 transition-colors">
                      <FolderOpen className="h-4 w-4" />
                      <span className="text-sm">{t('View Projects')}</span>
                    </Link>
                  )}
                  {dashboardData?.tasks && (
                    <Link href={route('tasks.index')} className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 transition-colors">
                      <CheckSquare className="h-4 w-4" />
                      <span className="text-sm">{t('View Tasks')}</span>
                    </Link>
                  )}
                  {dashboardData?.expenses && userWorkspaceRole !== 'client' &&(
                    <Link href={route('expenses.create')} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors">
                      <Receipt className="h-4 w-4" />
                      <span className="text-sm">{t('Submit Expense')}</span>
                    </Link>
                  )}
                  {dashboardData?.invoices && userWorkspaceRole !== 'client' && (
                    <Link href={route('invoices.create')} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm">{t('Create Invoice')}</span>
                    </Link>
                  )}
                  {hasRoleDashboardAccess && (
                    <Link href={route('roles.dashboard')} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors">
                      <Shield className="h-4 w-4" />
                      <span className="text-sm">{t('Workspace Roles')}</span>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </PageTemplate>
  );
}