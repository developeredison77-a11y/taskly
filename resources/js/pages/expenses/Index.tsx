import React, { useState, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import { toast } from '@/components/custom-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, Filter, Eye, Edit, Copy, Trash2, LayoutGrid, List, Receipt, Calendar, User as UserIcon, CheckCircle, XCircle, Clock, AlertCircle, FileText } from 'lucide-react';
import { PageTemplate } from '@/components/page-template';
import { CrudTable } from '@/components/CrudTable';
import { hasPermission } from '@/utils/authorization';
import ExpenseFormModal from '@/components/expenses/ExpenseFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import TaskFileUpload, { TaskFileItem } from '@/components/tasks/TaskFileUpload';
import { useTranslation } from 'react-i18next';



interface Expense {
    id: number;
    project: {
        id: number;
        title: string;
    };
    budget_category?: {
        id: number;
        name: string;
        color: string;
    };
    submitter: {
        id: number;
        name: string;
        avatar?: string;
    };
    amount: number;
    currency: string;
    expense_date: string;
    title: string;
    description?: string;
    vendor?: string;
    status: 'pending' | 'approved' | 'rejected' | 'requires_info';
    created_at: string;
    can_edit?: boolean;
    can_delete?: boolean;
    attachments?: any[];
}

export default function ExpenseIndex() {
    const { t } = useTranslation();
    const { expenses, projects, categories, filters, auth, project_name, userWorkspaceRole, workspace, budget_id, flash, permissions: pagePermissions } = usePage().props as any;
    const expensePermissions = pagePermissions;
    
    const formatText = (text: string) => {
        return text.replace(/_/g, ' ').split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
    };

    // Show flash messages
    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash]);

    // Get project name from projects array if not directly provided
    const currentProjectName = project_name || (filters?.project_id ?
        projects?.find((p: any) => p.id.toString() === filters.project_id.toString())?.title
        : null);

    const [activeView, setActiveView] = useState('grid');
    const [searchTerm, setSearchTerm] = useState(filters?.search || '');
    const [selectedProject, setSelectedProject] = useState(filters?.project_id || 'all');
    const [selectedCategory, setSelectedCategory] = useState(filters?.category_id || 'all');
    const [selectedStatus, setSelectedStatus] = useState(filters?.status || 'all');
    const [showFilters, setShowFilters] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentExpense, setCurrentExpense] = useState<Expense | null>(null);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [deleteExpense, setDeleteExpense] = useState<Expense | null>(null);
    const [isFilesModalOpen, setIsFilesModalOpen] = useState(false);
    const [filesExpense, setFilesExpense] = useState<Expense | null>(null);



    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const applyFilters = () => {
        const params: any = { page: 1 };
        if (searchTerm) params.search = searchTerm;
        if (selectedProject !== 'all') params.project_id = selectedProject;
        if (selectedCategory !== 'all') params.category_id = selectedCategory;
        if (selectedStatus !== 'all') params.status = selectedStatus;
        if (filters?.per_page) params.per_page = filters.per_page;
        if (filters?.sort_by) params.sort_by = filters.sort_by;
        if (filters?.sort_order) params.sort_order = filters.sort_order;
        router.get(route('expenses.index'), params, { preserveState: false, preserveScroll: false });
    };

    // Add sorting functionality
    const handleSort = (field: string) => {
        const direction = filters?.sort_by === field && filters?.sort_order === 'asc' ? 'desc' : 'asc';
        
        const params: any = { 
            sort_by: field, 
            sort_order: direction, 
            page: 1 
        };
        
        // Preserve existing filters
        if (searchTerm) params.search = searchTerm;
        if (selectedProject !== 'all') params.project_id = selectedProject;
        if (selectedCategory !== 'all') params.category_id = selectedCategory;
        if (selectedStatus !== 'all') params.status = selectedStatus;
        if (filters?.per_page) params.per_page = filters.per_page;
        
        router.get(route('expenses.index'), params, { preserveState: true, preserveScroll: true });
    };

    const handleAction = (action: string, expenseOrId: Expense | number) => {
        let expense: Expense;
        
        if (typeof expenseOrId === 'number') {
            // Called from CrudTable with ID
            expense = expenses?.data?.find((e: Expense) => e.id === expenseOrId);
            if (!expense) return;
        } else {
            // Called from grid view with expense object
            expense = expenseOrId;
        }
        
        switch (action) {
            case 'view':
                router.get(route('expenses.show', expense.id));
                break;
            case 'edit':
                setCurrentExpense(expense);
                setModalMode('edit');
                setIsModalOpen(true);
                break;
            case 'duplicate':
                toast.loading(t('Duplicating expense...'));
                router.post(route('expenses.duplicate', expense.id), {}, {
                    onSuccess: () => {
                        toast.dismiss();
                    },
                    onError: () => {
                        toast.dismiss();
                        toast.error(t('Failed to duplicate expense'));
                    }
                });
                break;
            case 'files':
                setFilesExpense(expense);
                setIsFilesModalOpen(true);
                break;
            case 'delete':
                setDeleteExpense(expense);
                break;
        }
    };

    const handleAddNew = () => {
        setCurrentExpense(null);
        setModalMode('create');
        setIsModalOpen(true);
    };

    const getStatusColor = (status: string) => {
        const colors = {
            pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
            approved: 'bg-green-100 text-green-800 border-green-300',
            rejected: 'bg-red-100 text-red-800 border-red-300',
            requires_info: 'bg-blue-100 text-blue-800 border-blue-300' 
        };
        return colors[status as keyof typeof colors] || 'bg-gray-200 text-gray-800 border-gray-300';
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'approved': return <CheckCircle className="h-4 w-4 text-green-600" />;
            case 'rejected': return <XCircle className="h-4 w-4 text-red-600" />;
            case 'requires_info': return <AlertCircle className="h-4 w-4 text-blue-600" />;
            default: return <Clock className="h-4 w-4 text-yellow-600" />;
        }
    };

    const formatCurrency = (amount: string | number) => {
        if (typeof window !== 'undefined' && window.appSettings?.formatCurrency) {
            const numericAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
            return window.appSettings.formatCurrency(numericAmount, { showSymbol: true });
        }
        return amount || 0;
    };

    const getAttachmentSize = (attachment: any): number => {
        const size =
            attachment.media_item?.size ??
            attachment.mediaItem?.size ??
            attachment.media_item?.file_size ??
            attachment.mediaItem?.file_size ??
            attachment.media_item?.filesize ??
            attachment.mediaItem?.filesize ??
            attachment.size ??
            0;

        return typeof size === 'number' ? size : Number(size) || 0;
    };

    const mapAttachmentToTaskFile = (attachment: any): TaskFileItem => ({
        id: attachment.media_item?.id || attachment.mediaItem?.id || attachment.media_item_id,
        media_id: attachment.media_item?.id || attachment.mediaItem?.id || attachment.media_item_id,
        attachment_id: attachment.id,
        name: attachment.media_item?.name || attachment.mediaItem?.name || 'file',
        url: attachment.media_item?.url || attachment.mediaItem?.url || route('expense-attachments.preview', attachment.id),
        thumb_url: attachment.media_item?.thumb_url || attachment.mediaItem?.thumb_url || route('expense-attachments.preview', attachment.id),
        preview_url: route('expense-attachments.preview', attachment.id),
        download_url: route('expense-attachments.download', attachment.id),
        mime_type: attachment.media_item?.mime_type || attachment.mediaItem?.mime_type || '',
        size: getAttachmentSize(attachment)
    });

    const pageActions = [];

    if (expensePermissions?.create) {
        pageActions.push({
            label: t('Add Expense'),
            icon: <Plus className="h-4 w-4 mr-2" />,
            variant: 'default',
            onClick: handleAddNew
        });
    }

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Budget & Expenses') },
        ...(currentProjectName ? [
            { title: t('Projects'), href: route('projects.index') },
            { title: t('Budgets'), href: route('budgets.index') }
        ] : []),
        { title: currentProjectName ? `${currentProjectName} - ${t('Expenses')}` : t('Expenses') }
    ];

    return (
        <PageTemplate
            title={currentProjectName ? `${currentProjectName} - ${t('Expenses')}` : t('Expenses')}
            url="/expenses"
            actions={pageActions}
            breadcrumbs={breadcrumbs}
            noPadding
        >
            {/* Overview Row */}
            <div className="bg-white rounded-lg shadow mb-4 p-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{expenses?.total || 0}</div>
                        <div className="text-sm text-gray-600">{t('Total Expenses')}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                            {expenses?.data?.filter((exp: Expense) => exp.status === 'pending').length || 0}
                        </div>
                        <div className="text-sm text-gray-600">{t('Pending')}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                            {expenses?.data?.filter((exp: Expense) => exp.status === 'approved').length || 0}
                        </div>
                        <div className="text-sm text-gray-600">{t('Approved')}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                            {expenses?.data?.filter((exp: Expense) => exp.status === 'rejected').length || 0}
                        </div>
                        <div className="text-sm text-gray-600">{t('Rejected')}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                            {(() => {
                                if (!expenses?.data || expenses.data.length === 0) {
                                    return formatCurrency(0);
                                }
                                const total = expenses.data.reduce((sum: number, exp: Expense) => {
                                    return sum + (parseFloat(exp.amount?.toString()) || 0);
                                }, 0);
                                const currency = workspace?.currency || expenses.data[0]?.currency || 'USD';
                                return formatCurrency(total);
                            })()
                            }
                        </div>
                        <div className="text-sm text-gray-600">{t('Total Amount')}</div>
                    </div>
                </div>
            </div>

            {/* Filters Row */}
            <div className="bg-white rounded-lg shadow mb-4">
                <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <form onSubmit={handleSearch} className="flex gap-2">
                                <div className="relative w-64">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder={t('Search expenses...')}
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            clearTimeout(window.searchTimeout);
                                            window.searchTimeout = setTimeout(() => {
                                                const params: any = { page: 1 };
                                                if (e.target.value) params.search = e.target.value;
                                                if (selectedProject !== 'all') params.project_id = selectedProject;
                                                if (selectedCategory !== 'all') params.category_id = selectedCategory;
                                                if (selectedStatus !== 'all') params.status = selectedStatus;
                                                router.get(route('expenses.index'), params, { preserveState: true, preserveScroll: true });
                                            }, 500);
                                        }}
                                        className="w-full pl-9"
                                    />
                                </div>
                                <Button type="submit" size="sm">
                                    <Search className="h-4 w-4 mr-1.5" />
                                    {t('Search')}
                                </Button>
                            </form>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowFilters(!showFilters)}
                            >
                                <Filter className="h-4 w-4 mr-1.5" />
                                {t('Filters')}
                            </Button>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="border rounded-md p-0.5">
                                <Button
                                    size="sm"
                                    variant={activeView === 'list' ? "default" : "ghost"}
                                    className="h-7 px-2"
                                    onClick={() => setActiveView('list')}
                                >
                                    <List className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant={activeView === 'grid' ? "default" : "ghost"}
                                    className="h-7 px-2"
                                    onClick={() => setActiveView('grid')}
                                >
                                    <LayoutGrid className="h-4 w-4" />
                                </Button>
                            </div>

                            <Label className="text-xs text-muted-foreground">{t('Per Page:')}</Label>
                            <Select
                                value={expenses?.per_page?.toString() || filters?.per_page?.toString() || "12"}
                                onValueChange={(value) => {
                                    const params: any = { page: 1, per_page: parseInt(value) };
                                    if (searchTerm) params.search = searchTerm;
                                    if (selectedProject !== 'all') params.project_id = selectedProject;
                                    if (selectedCategory !== 'all') params.category_id = selectedCategory;
                                    if (selectedStatus !== 'all') params.status = selectedStatus;
                                    if (filters?.sort_by) params.sort_by = filters.sort_by;
                                    if (filters?.sort_order) params.sort_order = filters.sort_order;
                                    router.get(route('expenses.index'), params, { preserveState: true, preserveScroll: true });
                                }}
                            >
                                <SelectTrigger className="w-16 h-8">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="12">12</SelectItem>
                                    <SelectItem value="24">24</SelectItem>
                                    <SelectItem value="48">48</SelectItem>
                                    <SelectItem value="100">100</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {showFilters && (
                        <div className="p-4 bg-gray-50 border rounded-md">
                            <div className="flex flex-wrap gap-4 items-end">
                                <div className="space-y-2">
                                    <Label>{t('Project')}</Label>
                                    <Select value={selectedProject} onValueChange={(value) => {
                                        setSelectedProject(value);
                                        const params: any = { page: 1 };
                                        if (searchTerm) params.search = searchTerm;
                                        if (value !== 'all') params.project_id = value;
                                        if (selectedCategory !== 'all') params.category_id = selectedCategory;
                                        if (selectedStatus !== 'all') params.status = selectedStatus;
                                        router.get(route('expenses.index'), params, { preserveState: true, preserveScroll: true });
                                    }}>
                                        <SelectTrigger className="w-40">
                                            <SelectValue placeholder={t('All Projects')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All</SelectItem>
                                            {projects?.map((project: any) => (
                                                <SelectItem key={project.id} value={project.id.toString()}>
                                                    {project.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>{t('Category')}</Label>
                                    <Select value={selectedCategory} onValueChange={(value) => {
                                        setSelectedCategory(value);
                                        const params: any = { page: 1 };
                                        if (searchTerm) params.search = searchTerm;
                                        if (selectedProject !== 'all') params.project_id = selectedProject;
                                        if (value !== 'all') params.category_id = value;
                                        if (selectedStatus !== 'all') params.status = selectedStatus;
                                        router.get(route('expenses.index'), params, { preserveState: true, preserveScroll: true });
                                    }}>
                                        <SelectTrigger className="w-40">
                                            <SelectValue placeholder={t('All Categories')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All</SelectItem>
                                            {categories?.map((category: any) => (
                                                <SelectItem key={category.id} value={category.id.toString()}>
                                                    {category.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>{t('Status')}</Label>
                                    <Select value={selectedStatus} onValueChange={(value) => {
                                        setSelectedStatus(value);
                                        const params: any = { page: 1 };
                                        if (searchTerm) params.search = searchTerm;
                                        if (selectedProject !== 'all') params.project_id = selectedProject;
                                        if (selectedCategory !== 'all') params.category_id = selectedCategory;
                                        if (value !== 'all') params.status = value;
                                        router.get(route('expenses.index'), params, { preserveState: true, preserveScroll: true });
                                    }}>
                                        <SelectTrigger className="w-40">
                                            <SelectValue placeholder={t('All Status')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All</SelectItem>
                                            <SelectItem value="pending">Pending</SelectItem>
                                            <SelectItem value="approved">Approved</SelectItem>
                                            <SelectItem value="rejected">Rejected</SelectItem>
                                            <SelectItem value="requires_info">Requires Info</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <Button variant="outline" size="sm" onClick={() => {
                                    setSelectedProject('all');
                                    setSelectedCategory('all');
                                    setSelectedStatus('all');
                                    setSearchTerm('');
                                    setShowFilters(false);
                                    router.get(route('expenses.index'), { page: 1 }, { preserveState: true, preserveScroll: true });
                                }}>
                                    {t('Reset Filters')}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Expense Content */}
            <div className="bg-white rounded-lg shadow">
                {activeView === 'grid' ? (
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {expenses?.data?.map((expense: Expense) => (
                                <Card key={expense.id} className="overflow-hidden hover:shadow-md transition-shadow">
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <CardTitle className="text-base line-clamp-1">{expense.title}</CardTitle>
                                            <div className="flex items-center gap-1">
                                                {getStatusIcon(expense.status)}
                                                <Badge className={getStatusColor(expense.status)} variant="secondary">
                                                    {formatText(expense.status)}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <span>{formatCurrency(expense.amount)}</span>
                                            <span>•</span>
                                            <span>{expense.project.title}</span>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="py-2">
                                        <div className="space-y-3">
                                            {expense.description && (
                                                <p className="text-sm text-gray-600 line-clamp-2">{expense.description}</p>
                                            )}

                                            <div className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    <span>{new Date(expense.expense_date).toLocaleDateString()}</span>
                                                </div>
                                                {expense.budget_category && (
                                                    <div className="flex items-center gap-1">
                                                        <div
                                                            className="w-3 h-3 rounded-full"
                                                            style={{ backgroundColor: expense.budget_category.color }}
                                                        />
                                                        <span>{expense.budget_category.name}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-6 w-6">
                                                        <AvatarImage src={expense.submitter.avatar} />
                                                        <AvatarFallback className="text-xs">
                                                            {expense.submitter.name?.charAt(0)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-xs text-muted-foreground">{expense.submitter.name}</span>
                                                </div>

                                                {expense.vendor && (
                                                    <span className="text-xs text-muted-foreground">{expense.vendor}</span>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>

                                    <CardFooter className="flex justify-end gap-1 pt-0 pb-2">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleAction('files', expense)}
                                                    className="text-purple-500 hover:text-purple-700 h-8 w-8"
                                                >
                                                    <FileText className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>{t('Files')}</TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleAction('view', expense)}
                                                    className="text-blue-500 hover:text-blue-700 h-8 w-8"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>View</TooltipContent>
                                        </Tooltip>
                                        {expensePermissions?.update && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleAction('edit', expense)}
                                                        className="text-amber-500 hover:text-amber-700 h-8 w-8"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Edit</TooltipContent>
                                            </Tooltip>
                                        )}
                                        {expensePermissions?.create && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleAction('duplicate', expense)}
                                                        className="text-green-500 hover:text-green-700 h-8 w-8"
                                                    >
                                                        <Copy className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Duplicate</TooltipContent>
                                            </Tooltip>
                                        )}
                                        {expensePermissions?.delete && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-red-500 hover:text-red-700 h-8 w-8"
                                                        onClick={() => handleAction('delete', expense)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Delete</TooltipContent>
                                            </Tooltip>
                                        )}
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </div>
                ) : (
                    <CrudTable
                        columns={[
                            {
                                key: 'title',
                                label: t('Expense'),
                                sortable: true,
                                render: (value: string, row: any) => (
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">{value}</div>
                                        {row.description && (
                                            <div className="text-sm text-gray-500 truncate max-w-xs">{row.description}</div>
                                        )}
                                    </div>
                                )
                            },
                            {
                                key: 'amount',
                                label: t('Amount'),
                                sortable: true,
                                render: (value: number, row: any) => (
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">
                                            {formatCurrency(value)}
                                        </div>
                                        {row.vendor && (
                                            <div className="text-sm text-gray-500">{row.vendor}</div>
                                        )}
                                    </div>
                                )
                            },
                            {
                                key: 'project.title',
                                label: t('Project & Category'),
                                sortable: true,
                                render: (value: string, row: any) => (
                                    <div>
                                        <div className="text-sm font-medium text-gray-900">{value}</div>
                                        {row.budget_category ? (
                                            <div className="flex items-center gap-1 mt-1">
                                                <div
                                                    className="w-2 h-2 rounded-full"
                                                    style={{ backgroundColor: row.budget_category.color }}
                                                />
                                                <span className="text-xs text-gray-500">{row.budget_category.name}</span>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-400 mt-1 block">{t('Uncategorized')}</span>
                                        )}
                                    </div>
                                )
                            },
                            {
                                key: 'status',
                                label: t('Status'),
                                sortable: true,
                                render: (value: string) => (
                                    <div className="flex items-center gap-2">
                                        {getStatusIcon(value)}
                                        <Badge className={getStatusColor(value)} variant="secondary">
                                            {formatText(value)}
                                        </Badge>
                                    </div>
                                )
                            },
                            {
                                key: 'submitter.name',
                                label: t('Submitter'),
                                sortable: true,
                                render: (value: string, row: any) => (
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-6 w-6">
                                            <AvatarImage src={row.submitter.avatar} />
                                            <AvatarFallback className="text-xs">
                                                {row.submitter.name?.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm">{value}</span>
                                    </div>
                                )
                            },
                            {
                                key: 'expense_date',
                                label: t('Date'),
                                sortable: true,
                                render: (value: string) => (
                                    <span className="text-sm text-gray-900">
                                        {new Date(value).toLocaleDateString()}
                                    </span>
                                )
                            }
                        ]}
                        actions={[
                            {
                                label: t('Files'),
                                icon: 'FileText',
                                action: 'files',
                                className: 'text-purple-500 hover:text-purple-700',
                                condition: () => true
                            },
                            {
                                label: t('View'),
                                icon: 'Eye',
                                action: 'view',
                                className: 'text-blue-500 hover:text-blue-700',
                                condition: () => true
                            },
                            {
                                label: t('Edit'),
                                icon: 'Edit',
                                action: 'edit',
                                className: 'text-amber-500 hover:text-amber-700',
                                condition: () => expensePermissions?.update
                            },
                            {
                                label: t('Duplicate'),
                                icon: 'Copy',
                                action: 'duplicate',
                                className: 'text-green-500 hover:text-green-700',
                                condition: () => expensePermissions?.create
                            },
                            {
                                label: t('Delete'),
                                icon: 'Trash2',
                                action: 'delete',
                                className: 'text-red-500 hover:text-red-700',
                                condition: () => expensePermissions?.delete
                            }
                        ]}
                        data={expenses?.data || []}
                        from={expenses?.from || 1}
                        onAction={handleAction}
                        sortField={filters?.sort_by}
                        sortDirection={filters?.sort_order}
                        onSort={handleSort}
                        permissions={auth?.permissions || []}
                    />
                )}
            </div>

            {/* Pagination */}
            {expenses?.links && expenses.data?.length > 0 && (
                <div className="mt-6 bg-white p-4 rounded-lg shadow flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        {t('Showing')} <span className="font-medium">{expenses?.from || 0}</span> {t('to')} <span className="font-medium">{expenses?.to || 0}</span> {t('of')} <span className="font-medium">{expenses?.total || 0}</span> {t('expenses')}
                    </div>

                    <div className="flex gap-1">
                        {expenses?.links?.map((link: any, i: number) => {
                            const isTextLink = link.label === "&laquo; Previous" || link.label === "Next &raquo;";
                            const label = link.label.replace("&laquo; ", "").replace(" &raquo;", "");

                            return (
                                <Button
                                    key={i}
                                    variant={link.active ? 'default' : 'outline'}
                                    size={isTextLink ? "sm" : "icon"}
                                    className={isTextLink ? "px-3" : "h-8 w-8"}
                                    disabled={!link.url}
                                    onClick={() => link.url && router.get(link.url)}
                                >
                                    {isTextLink ? label : <span dangerouslySetInnerHTML={{ __html: link.label }} />}
                                </Button>
                            );
                        })}
                    </div>
                </div>
            )}

            {expenses?.data?.length === 0 && (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <Receipt className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500 mb-4">{t('No expenses found')}</p>
                    {expensePermissions?.create && (
                        <Button onClick={handleAddNew}>
                            <Plus className="h-4 w-4 mr-2" />
                            {t('Add your first expense')}
                        </Button>
                    )}
                </div>
            )}


            <ExpenseFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                expense={currentExpense}
                projects={projects}
                mode={modalMode}
                redirectUrl={route('expenses.index')}
            />

            <Dialog open={isFilesModalOpen} onOpenChange={(open) => {
                setIsFilesModalOpen(open);
                if (!open) setFilesExpense(null);
            }}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{t('Files')} {filesExpense?.title ? `- ${filesExpense.title}` : ''}</DialogTitle>
                    </DialogHeader>
                    {filesExpense?.attachments?.length ? (
                        <TaskFileUpload
                            mode="view"
                            files={(filesExpense.attachments || []).map(mapAttachmentToTaskFile)}
                        />
                    ) : (
                        <div className="text-sm text-muted-foreground">{t('No files available')}</div>
                    )}
                </DialogContent>
            </Dialog>

            <CrudDeleteModal
                isOpen={!!deleteExpense}
                onClose={() => setDeleteExpense(null)}
                onConfirm={() => {
                    if (deleteExpense) {
                        toast.loading(t('Deleting expense...'));
                        router.delete(route('expenses.destroy', deleteExpense.id), {
                            onSuccess: () => {
                                toast.dismiss();
                                setDeleteExpense(null);
                            },
                            onError: () => {
                                toast.dismiss();
                                toast.error(t('Failed to delete expense'));
                                setDeleteExpense(null);
                            }
                        });
                    }
                }}
                itemName={deleteExpense?.title || ''}
                entityName={t('Expense')}
                additionalInfo={[
                    `${t('Amount')}: ${deleteExpense ? formatCurrency(deleteExpense.amount) : ''}`,
                    `${t('Project')}: ${deleteExpense?.project.title || ''}`,
                    `${t('Date')}: ${deleteExpense ? new Date(deleteExpense.expense_date).toLocaleDateString() : ''}`
                ]}
            />

        </PageTemplate>
    );
}
