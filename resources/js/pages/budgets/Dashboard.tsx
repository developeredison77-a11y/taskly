import React, { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import BudgetOverview from '@/components/budgets/BudgetOverview';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, TrendingUp, Eye } from 'lucide-react';
import { router } from '@inertiajs/react';
import { formatCurrency } from '@/utils/currency';
import { useTranslation } from 'react-i18next';

interface BudgetDashboardProps {
    initialData?: any;
}

export default function BudgetDashboard({ initialData }: BudgetDashboardProps) {
    const { t } = useTranslation();
    const [dashboardData, setDashboardData] = useState<any>(initialData || null);
    const [loading, setLoading] = useState(!initialData);

    const formatText = (text: string) => {
        return text.replace(/_/g, ' ').split(' ').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
    };

    useEffect(() => {
        if (!initialData) {
            loadDashboardData();
        }
    }, [initialData]);

    const loadDashboardData = async () => {
        try {
            const response = await fetch(route('budget-dashboard.overview'));
            const data = await response.json();
            setDashboardData(data);
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };



    const getAlertColor = (level: string) => {
        switch (level) {
            case 'critical': return 'bg-red-100 text-red-800';
            case 'warning': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-blue-100 text-blue-800';
        }
    };

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Budget & Expenses') },
        { title: t('Budget Dashboard') }
    ];

    if (loading) {
        return (
            <PageTemplate
                title={t('Budget Dashboard')}
                description={t('Overview of budget performance and expense tracking')}
                url="/budgets/dashboard"
                breadcrumbs={breadcrumbs}
            >
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500">{t('Loading dashboard...')}</div>
                </div>
            </PageTemplate>
        );
    }

    return (
        <PageTemplate
            title={t('Budget Dashboard')}
            description={t('Overview of budget performance and expense tracking')}
            url="/budgets/dashboard"
            breadcrumbs={breadcrumbs}
            noPadding
        >
            <div className="space-y-6">
                {/* Budget Overview */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-6">
                    <BudgetOverview summary={dashboardData?.summary} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Recent Expenses */}
                    <Card className="lg:col-span-2">
                        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-t-lg">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-green-800 dark:text-green-200">
                                    <TrendingUp className="h-5 w-5" />
                                    {t('Recent Expenses')}
                                </CardTitle>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-green-200 text-green-700 hover:bg-green-50"

                                    onClick={() => router.get(route('expenses.index'))}
                                >
                                    <Eye className="h-4 w-4 mr-2" />
                                    {t('View All')}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {dashboardData?.recent_expenses && dashboardData.recent_expenses.length > 0 ? (
                                <div className="space-y-3">
                                    {dashboardData.recent_expenses.slice(0, 6).map((expense: any) => (
                                        <div key={expense.id || Math.random()} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                                                    <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{expense.title || t('Untitled Expense')}</div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                        {expense.project?.title || t('Unknown Project')} • {expense.submitter?.name || t('Unknown User')}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right flex-shrink-0 ml-4">
                                                <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                                    {formatCurrency(expense.amount || 0)}
                                                </div>
                                                <Badge
                                                    variant="secondary"
                                                    className={
                                                        expense.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs' :
                                                            expense.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 text-xs' :
                                                                'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs'
                                                    }
                                                >
                                                    {formatText(expense.status || 'pending')}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <TrendingUp className="h-6 w-6 text-gray-400" />
                                    </div>
                                    <p className="text-sm font-medium">{t('No recent expenses')}</p>
                                    <p className="text-xs text-gray-400">{t('Expenses will appear here once submitted')}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Top Categories */}
                    <Card>
                        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-t-lg">
                            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-purple-800 dark:text-purple-200">
                                <AlertTriangle className="h-5 w-5" />
                                {t('Top Categories')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {dashboardData?.top_categories && dashboardData.top_categories.length > 0 ? (
                                <div className="space-y-3">
                                    {dashboardData.top_categories.slice(0, 5).map((category: any, index: number) => (
                                        <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                            <div
                                                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                                                style={{ backgroundColor: category.color || '#6B7280' }}
                                            >
                                                {(category.name || 'U').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{category.name || t('Unknown')}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {formatCurrency(category.total_spent || 0)} / {formatCurrency(category.allocated_amount || 0)}
                                                </div>
                                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1.5">
                                                    <div
                                                        className="h-1.5 rounded-full transition-all duration-300"
                                                        style={{
                                                            backgroundColor: category.color || '#6B7280',
                                                            width: `${Math.min(((category.total_spent || 0) / (category.allocated_amount || 1)) * 100, 100)}%`
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <AlertTriangle className="h-6 w-6 text-gray-400" />
                                    </div>
                                    <p className="text-sm font-medium">{t('No categories')}</p>
                                    <p className="text-xs text-gray-400">{t('Categories will appear here')}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </PageTemplate>
    );
}