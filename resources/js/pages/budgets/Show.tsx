import React, { useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import { PageTemplate } from '@/components/page-template';
import BudgetProgress from '@/components/budgets/BudgetProgress';
import BudgetFormModal from '@/components/budgets/BudgetFormModal';
import ExpenseFormModal from '@/components/expenses/ExpenseFormModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Edit, Plus, Receipt, Calendar, DollarSign, TrendingUp, AlertTriangle, ArrowLeft, Eye } from 'lucide-react';
import { formatCurrency } from '@/utils/currency';
import { useTranslation } from 'react-i18next';

export default function BudgetShow() {
    const { t } = useTranslation();
    const { budget, projects = [], permissions } = usePage().props as any;
    const { auth } = usePage().props as any;
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    
    const formatText = (text: string) => {
        return text.replace(/_/g, ' ').split(' ').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
    };



    const getStatusColor = (status: string) => {
        const colors = {
            active: 'bg-green-100 text-green-800',
            completed: 'bg-blue-100 text-blue-800',
            cancelled: 'bg-red-100 text-red-800'
        };
        return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
    };

    const pageActions = [
        {
            label: t('View Project'),
            icon: <Eye className="h-4 w-4 mr-2" />,
            variant: 'outline',
            onClick: () => router.get(route('projects.show', budget.project.id))
        },
        // {
        //     label: t('View Expenses'),
        //     icon: <Receipt className="h-4 w-4 mr-2" />,
        //     variant: 'outline',
        //     onClick: () => router.get(route('expenses.index', { project_id: budget.project_id, budget_id: budget.id }))
        // }
    ];

    if (permissions?.create) {
        pageActions.push({
            label: t('Add Expense'),
            icon: <Plus className="h-4 w-4 mr-2" />,
            variant: 'default',
            onClick: () => setIsExpenseModalOpen(true)
        });
    }

    if(auth?.permissions?.includes('budget_dashboard_view')) {
        pageActions.push({
            label: t('View Expenses'),
            icon: <Receipt className="h-4 w-4 mr-2" />,
            variant: 'outline',
            onClick: () => router.get(route('expenses.index', { project_id: budget.project_id, budget_id: budget.id }))
        });
    }

    if (permissions?.update) {
        pageActions.push({
            label: t('Edit Budget'),
            icon: <Edit className="h-4 w-4 mr-2" />,
            variant: 'outline',
            onClick: () => setIsEditModalOpen(true)
        });
    }

    pageActions.push({
        label: t('Back'),
        icon: <ArrowLeft className="h-4 w-4 mr-2" />,
        variant: 'outline',
        onClick: () => router.get(route('budgets.index'))
    });

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Budget & Expenses'), href: route('budgets.dashboard') },
        { title: t('Budgets'), href: route('budgets.index') },
        { title: budget.project.title }
    ];

    return (
        <PageTemplate
            title={budget.project.title}
            actions={pageActions}
            breadcrumbs={breadcrumbs}
            noPadding
        >
            <div className="space-y-6">
                {/* Budget Header with Stats */}
                <div className="bg-gradient-to-r from-primary to-primary/90 text-white rounded-lg shadow-lg">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-bold mb-2">{budget.project.title}</h2>
                                <p className="text-primary-foreground/80">{budget.description || t('Project Budget Overview')}</p>
                            </div>
                            <div className="text-right">
                                <Badge className={`${getStatusColor(budget.status)} border-0`} variant="secondary">
                                    {formatText(budget.status)}
                                </Badge>
                                <div className="mt-2 text-sm text-primary-foreground/80 flex items-center gap-2">
                                    <Calendar className="h-4 w-4" />
                                    <span className="capitalize">{budget.period_type} {t('Budget')}</span>
                                    <span>•</span>
                                    <span>{budget.start_date ? new Date(budget.start_date).toLocaleDateString() : t('Not set')} {t('to')} {budget.end_date ? new Date(budget.end_date).toLocaleDateString() : t('Ongoing')}</span>
                                </div>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <DollarSign className="h-5 w-5" />
                                    <span className="text-sm font-medium">{t('Total Budget')}</span>
                                </div>
                                <p className="text-2xl font-bold">
                                    {formatCurrency(budget.total_budget || 0)}
                                </p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className="h-5 w-5" />
                                    <span className="text-sm font-medium">{t('Total Spent')}</span>
                                </div>
                                <p className="text-2xl font-bold">
                                    {formatCurrency(budget.total_spent || 0)}
                                </p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <DollarSign className="h-5 w-5" />
                                    <span className="text-sm font-medium">{t('Remaining')}</span>
                                </div>
                                <p className="text-2xl font-bold">
                                    {formatCurrency(budget.remaining_budget || 0)}
                                </p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    {(budget.utilization_percentage || 0) >= 90 ? (
                                        <AlertTriangle className="h-5 w-5 text-red-200" />
                                    ) : (
                                        <TrendingUp className="h-5 w-5" />
                                    )}
                                    <span className="text-sm font-medium">{t('Utilization')}</span>
                                </div>
                                <p className="text-2xl font-bold">
                                    {(budget.utilization_percentage || 0).toFixed(1)}%
                                </p>
                            </div>
                        </div>

                        {/* Overall Progress Bar */}
                        <div className="mt-6">
                            <div className="flex justify-between text-sm mb-2">
                                <span>{t('Budget Progress')}</span>
                                <span>{(budget.utilization_percentage || 0).toFixed(1)}%</span>
                            </div>
                            <div className="bg-white/20 rounded-full h-3">
                                <div
                                    className={`h-3 rounded-full transition-all ${
                                        (budget.utilization_percentage || 0) >= 90 ? 'bg-red-400' :
                                        (budget.utilization_percentage || 0) >= 75 ? 'bg-yellow-400' : 'bg-green-400'
                                    }`}
                                    style={{ width: `${Math.min(budget.utilization_percentage || 0, 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Budget Progress Details */}
                <BudgetProgress budget={budget} />

                {/* Recent Expenses */}
                <div className="bg-white rounded-lg shadow-sm border">
                    <div className="p-6 border-b">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                                    <Receipt className="h-5 w-5 text-blue-600" />
                                    {t('Recent Expenses')}
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">{t('Latest expense submissions for this project')}</p>
                            </div>
                            {auth?.permissions?.includes('budget_dashboard_view') &&
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.get(route('expenses.index', { project_id: budget.project_id }))}
                            >
                                {t('View All')}
                            </Button>
                            }
                        </div>
                    </div>

                    <div className="p-6">
                        {budget.expenses?.length > 0 ? (
                            <div className="space-y-4">
                                {budget.expenses.slice(0, 5).map((expense: any) => (
                                    <div key={expense.id} className="group bg-gray-50 rounded-xl p-5 hover:bg-blue-50 hover:border-blue-200 border border-transparent transition-all duration-200">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h2 className="font-semibold text-gray-900 group-hover:text-blue-900">{expense.title}</h2>
                                                    <Badge
                                                        variant="secondary"
                                                        className={
                                                            expense.status === 'approved' ? 'bg-green-100 text-green-800 border-green-200' :
                                                            expense.status === 'rejected' ? 'bg-red-100 text-red-800 border-red-200' :
                                                            'bg-yellow-100 text-yellow-800 border-yellow-200'
                                                        }
                                                    >
                                                        {formatText(expense.status)}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                                    <span className="flex items-center gap-1">
                                                        <span className="font-medium">{expense.submitter.name}</span>
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {new Date(expense.expense_date).toLocaleDateString()}
                                                    </span>
                                                    {expense.budget_category && (
                                                        <span className="flex items-center gap-1">
                                                            <div
                                                                className="w-3 h-3 rounded-full"
                                                                style={{ backgroundColor: expense.budget_category.color }}
                                                            />
                                                            {expense.budget_category.name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right ml-6">
                                                <div className="text-xl font-bold text-gray-900 group-hover:text-blue-900">
                                                    {formatCurrency(expense.amount)}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {expense.vendor && `via ${expense.vendor}`}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {budget.expenses.length > 5 && (
                                    <div className="text-center pt-4 border-t border-gray-200">
                                        <Button
                                            variant="ghost"
                                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                            onClick={() => router.get(route('expenses.index', { project_id: budget.project_id }))}
                                        >
                                            {t('View')} {budget.expenses.length - 5} {t('more expenses')} →
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-16">
                                <div className="bg-blue-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                                    <Receipt className="h-10 w-10 text-blue-500" />
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('No expenses submitted yet')}</h2>
                                <p className="text-gray-500 mb-6 max-w-md mx-auto">{t('Start tracking your project expenses to monitor budget utilization and spending patterns.')}</p>
                                {permissions?.create && (
                                    <Button
                                        size="lg"
                                        onClick={() => setIsExpenseModalOpen(true)}
                                        className="bg-blue-600 hover:bg-blue-700"
                                    >
                                        <Plus className="h-5 w-5 mr-2" />
                                        {t('Submit Your First Expense')}
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <BudgetFormModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                budget={budget}
                mode="edit"
            />

            <ExpenseFormModal
                isOpen={isExpenseModalOpen}
                onClose={() => setIsExpenseModalOpen(false)}
                projects={projects}
                mode="create"
                currentProject={{
                    ...budget.project,
                    budget: { categories: budget.categories || [] }
                }}
                redirectUrl={route('budgets.show', budget.id)}
            />
        </PageTemplate>
    );
}
