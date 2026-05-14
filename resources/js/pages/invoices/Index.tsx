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
import { Plus, Search, Filter, Eye, Edit, DollarSign, Trash2, LayoutGrid, List, FileText, Calendar, AlertTriangle, CreditCard, Send, Link, Download } from 'lucide-react';
import { PageTemplate } from '@/components/page-template';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { CrudTable } from '@/components/CrudTable';
import { InvoicePaymentModal } from '@/components/invoices/invoice-payment-modal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';

interface Invoice {
    id: number;
    invoice_number: string;
    project: {
        id: number;
        title: string;
    };
    client?: {
        id: number;
        name: string;
        avatar?: string;
    };
    title: string;
    total_amount: number;
    status: 'draft' | 'sent' | 'viewed' | 'paid' | 'partial_paid' | 'overdue' | 'cancelled';
    invoice_date: string;
    due_date: string;
    is_overdue: boolean;
    days_overdue: number;
    balance_due: number;
    formatted_total: string;
    status_color: string;
    payment_token: string;
    created_at: string;
}

export default function InvoiceIndex() {
    const { t } = useTranslation();
    const { invoices, projects, clients, filters, auth, userWorkspaceRole, flash, emailNotificationsEnabled } = usePage().props as any;

    // Show flash messages
    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash]);
    
    const [activeView, setActiveView] = useState('grid');
    const [searchTerm, setSearchTerm] = useState(filters?.search || '');
    const [selectedProject, setSelectedProject] = useState(filters?.project_id || 'all');
    const [selectedClient, setSelectedClient] = useState(filters?.client_id || 'all');
    const [selectedStatus, setSelectedStatus] = useState(filters?.status || 'all');
    const [showFilters, setShowFilters] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [invoiceToPay, setInvoiceToPay] = useState<Invoice | null>(null);
    const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
    const [invoiceToMarkPaid, setInvoiceToMarkPaid] = useState<Invoice | null>(null);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const applyFilters = () => {
        const params: any = { page: 1 };
        if (searchTerm) params.search = searchTerm;
        if (selectedProject !== 'all') params.project_id = selectedProject;
        if (selectedClient !== 'all') params.client_id = selectedClient;
        if (selectedStatus !== 'all') params.status = selectedStatus;
        if (filters?.per_page) params.per_page = filters.per_page;
        if (filters?.sort_by) params.sort_by = filters.sort_by;
        if (filters?.sort_order) params.sort_order = filters.sort_order;
        router.get(route('invoices.index'), params, { preserveState: true, preserveScroll: true });
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
        if (selectedClient !== 'all') params.client_id = selectedClient;
        if (selectedStatus !== 'all') params.status = selectedStatus;
        if (filters?.per_page) params.per_page = filters.per_page;
        
        router.get(route('invoices.index'), params, { preserveState: true, preserveScroll: true });
    };

    const handleAction = (action: string, invoice: Invoice) => {
        switch (action) {
            case 'view':
                router.get(route('invoices.show', invoice.id));
                break;
            case 'edit':
                router.get(route('invoices.edit', invoice.id));
                break;

            case 'mark-paid':
                setInvoiceToMarkPaid(invoice);
                setShowMarkPaidModal(true);
                break;
            case 'pay':
                setInvoiceToPay(invoice);
                setShowPaymentModal(true);
                break;
            case 'send':
                toast.loading('Sending invoice...');
                router.post(route('invoices.send', invoice.id), {}, {
                    onSuccess: () => {
                        toast.dismiss();
                    },
                    onError: () => {
                        toast.dismiss();
                        toast.error('Failed to send invoice');
                    }
                });
                break;
            case 'copy-payment-link':
                const paymentUrl = route('invoices.payment', invoice.payment_token);
                navigator.clipboard.writeText(paymentUrl).then(() => {
                    toast.success(t('Payment link copied to clipboard'));
                }).catch(() => {
                    toast.error(t('Failed to copy payment link'));
                });
                break;
            case 'delete':
                setInvoiceToDelete(invoice);
                setIsDeleteModalOpen(true);
                break;
        }
    };

    // CrudTable configuration
    const columns = [
        {
            key: 'invoice_number',
            label: t('Invoice'),
            sortable: true,
            render: (value: string, row: Invoice) => (
                <div>
                    <div 
                        className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                        onClick={() => handleAction('view', row)}
                    >
                        {value}
                    </div>
                    <div className="text-sm text-gray-500">{row.title}</div>
                </div>
            )
        },
        {
            key: 'project.title',
            label: t('Project'),
            render: (value: string, row: Invoice) => (
                <span className="text-sm font-medium text-gray-900">
                    {row.project?.title || t('No Project')}
                </span>
            )
        },
        {
            key: 'total_amount',
            label: t('Amount'),
            sortable: true,
            render: (value: number) => (
                <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(value)}
                </span>
            )
        },
        {
            key: 'status',
            label: t('Status'),
            sortable: true,
            render: (value: string, row: Invoice) => (
                <div className="flex items-center gap-2">
                    {row.is_overdue && <AlertTriangle className="h-4 w-4 text-red-500" />}
                    <Badge className={getStatusColor(value)} variant="secondary">
                        {value?.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </Badge>
                </div>
            )
        },
        {
            key: 'due_date',
            label: t('Due Date'),
            sortable: true,
            render: (value: string, row: Invoice) => (
                <div>
                    <div className="text-sm text-gray-900">{new Date(value).toLocaleDateString()}</div>
                    {row.is_overdue && (
                        <div className="text-xs text-red-600">
                            {row.days_overdue} days overdue
                        </div>
                    )}
                </div>
            )
        }
    ];

    const actions = [
        {
            label: t('View'),
            icon: 'Eye',
            action: 'view',
            className: 'text-blue-500 hover:text-blue-700'
        },
        {
            label: t('Edit'),
            icon: 'Edit',
            action: 'edit',
            className: 'text-amber-500 hover:text-amber-700',
            condition: (row: Invoice) => ['owner', 'manager'].includes(userWorkspaceRole) && row.status === 'draft'
        },
        {
            label: t('Send'),
            icon: 'Send',
            action: 'send',
            className: 'text-blue-500 hover:text-blue-700',
            condition: (row: Invoice) => ['owner', 'manager'].includes(userWorkspaceRole) && row.status === 'draft' && emailNotificationsEnabled
        },
        {
            label: t('Copy Payment Link'),
            icon: 'Link',
            action: 'copy-payment-link',
            className: 'text-purple-500 hover:text-purple-700',
            condition: (row: Invoice) => userWorkspaceRole !== 'client' && row.status !== 'paid'
        },
        {
            label: t('Mark as Paid'),
            icon: 'DollarSign',
            action: 'mark-paid',
            className: 'text-green-500 hover:text-green-700',
            condition: (row: Invoice) => userWorkspaceRole !== 'client' && (row.status === 'sent' || row.status === 'viewed' || row.status === 'overdue')
        },
        {
            label: t('Pay Now'),
            icon: 'CreditCard',
            action: 'pay',
            className: 'text-blue-500 hover:text-blue-700',
            condition: (row: Invoice) => userWorkspaceRole === 'client' && row.status !== 'paid' && row.status !== 'cancelled'
        },
        {
            label: t('Delete'),
            icon: 'Trash2',
            action: 'delete',
            className: 'text-red-500 hover:text-red-700',
            condition: (row: Invoice) => ['owner', 'manager'].includes(userWorkspaceRole) && row.status === 'draft'
        }
    ];

    const getStatusColor = (status: string) => {
        const colors = {
            draft: 'bg-gray-100 text-gray-800 border-gray-300',
            sent: 'bg-blue-100 text-blue-800 border-blue-300',
            viewed: 'bg-yellow-100 text-yellow-800 border-yellow-300',
            paid: 'bg-green-100 text-green-800 border-green-300',
            partial_paid: 'bg-orange-100 text-orange-800 border-orange-300',
            overdue: 'bg-red-100 text-red-800 border-red-300',
            cancelled: 'bg-gray-100 text-gray-800 border-gray-300'
        };
        return colors[status as keyof typeof colors] || 'bg-gray-200 text-gray-800 border-gray-300';
    };

    const formatCurrency = (amount: string | number) => {
        if (typeof window !== 'undefined' && window.appSettings?.formatCurrency) {
            const numericAmount = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
            return window.appSettings.formatCurrency(numericAmount);
        }
        return amount || 0;
    };

    const handleDeleteConfirm = () => {
        if (invoiceToDelete) {
            toast.loading('Deleting invoice...');
            router.delete(route('invoices.destroy', invoiceToDelete.id), {
                onSuccess: () => {
                    toast.dismiss();
                    setIsDeleteModalOpen(false);
                    setInvoiceToDelete(null);
                },
                onError: () => {
                    toast.dismiss();
                    toast.error('Failed to delete invoice');
                    setIsDeleteModalOpen(false);
                    setInvoiceToDelete(null);
                }
            });
        }
    };

    const handleMarkPaidConfirm = () => {
        if (invoiceToMarkPaid) {
            toast.loading('Marking invoice as paid...');
            router.post(route('invoices.mark-paid', invoiceToMarkPaid.id), {}, {
                onSuccess: () => {
                    toast.dismiss();
                    setShowMarkPaidModal(false);
                    setInvoiceToMarkPaid(null);
                },
                onError: () => {
                    toast.dismiss();
                    toast.error('Failed to mark invoice as paid');
                    setShowMarkPaidModal(false);
                    setInvoiceToMarkPaid(null);
                }
            });
        }
    };

    const hasActiveFilters = () => {
        return selectedStatus !== 'all' || selectedProject !== 'all' || selectedClient !== 'all' || searchTerm !== '';
    };

    const activeFilterCount = () => {
        return (selectedStatus !== 'all' ? 1 : 0) + (selectedProject !== 'all' ? 1 : 0) + (selectedClient !== 'all' ? 1 : 0) + (searchTerm ? 1 : 0);
    };

    const pageActions = [];
    
    // Export - only for non-clients
    if (userWorkspaceRole !== 'client') {
        pageActions.push({
            label: t('Export'),
            icon: <Download className="h-4 w-4 mr-2" />,
            variant: 'outline',
            onClick: async () => {
                try {
                    const params = new URLSearchParams();
                    if (searchTerm) params.append('search', searchTerm);
                    if (selectedProject !== 'all') params.append('project_id', selectedProject);
                    if (selectedClient !== 'all') params.append('client_id', selectedClient);
                    if (selectedStatus !== 'all') params.append('status', selectedStatus);
                    
                    const response = await fetch(route('invoices.export', params));
                    if (!response.ok) throw new Error('Export failed');
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `invoices_export_${new Date().toISOString().split('T')[0]}.xlsx`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                    toast.success(t('Export completed successfully'));
                } catch (error) {
                    toast.error(t('Export failed'));
                }
            }
        });
    }
    
    if (['owner', 'manager','member'].includes(userWorkspaceRole)) {
        pageActions.push({
            label: t('Create Invoice'),
            icon: <Plus className="h-4 w-4 mr-2" />,
            variant: 'default',
            onClick: () => router.get(route('invoices.create'))
        });
    }

    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Invoices') }
    ];

    return (
        <PageTemplate 
            title={t('Invoices')} 
            url="/invoices"
            actions={pageActions}
            breadcrumbs={breadcrumbs}
            noPadding
        >
            {/* Overview Stats */}
            <div className="bg-white rounded-lg shadow mb-4 p-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{invoices?.total || 0}</div>
                        <div className="text-sm text-gray-600">{t('Total Invoices')}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                            {invoices?.data?.filter((inv: Invoice) => inv.status === 'sent' || inv.status === 'viewed').length || 0}
                        </div>
                        <div className="text-sm text-gray-600">{t('Pending')}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                            {invoices?.data?.filter((inv: Invoice) => inv.status === 'paid').length || 0}
                        </div>
                        <div className="text-sm text-gray-600">{t('Paid')}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                            {invoices?.data?.filter((inv: Invoice) => inv.status === 'overdue').length || 0}
                        </div>
                        <div className="text-sm text-gray-600">{t('Overdue')}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                            {(() => {
                                if (!invoices?.data || invoices.data.length === 0) {
                                    return '$0.00';
                                }
                                const total = invoices.data.reduce((sum: number, inv: Invoice) => {
                                    return sum + (parseFloat(inv.total_amount?.toString()) || 0);
                                }, 0);
                                return formatCurrency(total);
                            })()}
                        </div>
                        <div className="text-sm text-gray-600">{t('Total Value')}</div>
                    </div>
                </div>
            </div>

            {/* Search and filters */}
            <div className="bg-white rounded-lg shadow mb-4">
                <div className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <form onSubmit={handleSearch} className="flex gap-2">
                                <div className="relative w-64">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder={t('Search invoices...')}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-9"
                                    />
                                </div>
                                <Button type="submit" size="sm">
                                    <Search className="h-4 w-4 mr-1.5" />
                                    {t('Search')}
                                </Button>
                            </form>
                            
                            <Button 
                                variant={hasActiveFilters() ? "default" : "outline"}
                                size="sm" 
                                className="h-8 px-2 py-1"
                                onClick={() => setShowFilters(!showFilters)}
                            >
                                <Filter className="h-3.5 w-3.5 mr-1.5" />
                                {showFilters ? t('Hide Filters') : t('Filters')}
                                {hasActiveFilters() && (
                                    <span className="ml-1 bg-primary-foreground text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs">
                                        {activeFilterCount()}
                                    </span>
                                )}
                            </Button>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <div className="border rounded-md p-0.5 mr-2">
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
                            
                            <Label className="text-xs text-muted-foreground">{t('Per Page')}:</Label>
                            <Select 
                                value={filters?.per_page?.toString() || "12"} 
                                onValueChange={(value) => {
                                    const params: any = { page: 1, per_page: parseInt(value) };
                                    if (searchTerm) params.search = searchTerm;
                                    if (selectedProject !== 'all') params.project_id = selectedProject;
                                    if (selectedClient !== 'all') params.client_id = selectedClient;
                                    if (selectedStatus !== 'all') params.status = selectedStatus;
                                    if (filters?.sort_by) params.sort_by = filters.sort_by;
                                    if (filters?.sort_order) params.sort_order = filters.sort_order;
                                    router.get(route('invoices.index'), params, { preserveState: false, preserveScroll: false });
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
                        <div className="w-full mt-3 p-4 bg-gray-50 border rounded-md">
                            <div className="flex flex-wrap gap-4 items-end">
                                <div className="space-y-2">
                                    <Label>{t('Project')}</Label>
                                    <Select value={selectedProject} onValueChange={(value) => {
                                        setSelectedProject(value);
                                        const params: any = { page: 1 };
                                        if (searchTerm) params.search = searchTerm;
                                        if (value !== 'all') params.project_id = value;
                                        if (selectedClient !== 'all') params.client_id = selectedClient;
                                        if (selectedStatus !== 'all') params.status = selectedStatus;
                                        if (filters?.per_page) params.per_page = filters.per_page;
                                        if (filters?.sort_by) params.sort_by = filters.sort_by;
                                        if (filters?.sort_order) params.sort_order = filters.sort_order;
                                        router.get(route('invoices.index'), params, { preserveState: false, preserveScroll: false });
                                    }}>
                                        <SelectTrigger className="w-40">
                                            <SelectValue placeholder={t('All Projects')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('All Projects')}</SelectItem>
                                            {projects?.map((project: any) => (
                                                <SelectItem key={project.id} value={project.id.toString()}>
                                                    {project.title}
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
                                        if (selectedClient !== 'all') params.client_id = selectedClient;
                                        if (value !== 'all') params.status = value;
                                        if (filters?.per_page) params.per_page = filters.per_page;
                                        if (filters?.sort_by) params.sort_by = filters.sort_by;
                                        if (filters?.sort_order) params.sort_order = filters.sort_order;
                                        router.get(route('invoices.index'), params, { preserveState: false, preserveScroll: false });
                                    }}>
                                        <SelectTrigger className="w-40">
                                            <SelectValue placeholder={t('All Status')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Status</SelectItem>
                                            <SelectItem value="draft">Draft</SelectItem>
                                            <SelectItem value="sent">Sent</SelectItem>
                                            <SelectItem value="viewed">Viewed</SelectItem>
                                            <SelectItem value="paid">Paid</SelectItem>
                                            <SelectItem value="partial_paid">Partially Paid</SelectItem>
                                            <SelectItem value="overdue">Overdue</SelectItem>
                                            <SelectItem value="cancelled">Cancelled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <Button variant="outline" size="sm" onClick={() => {
                                    setSelectedProject('all');
                                    setSelectedClient('all');
                                    setSelectedStatus('all');
                                    setSearchTerm('');
                                    setShowFilters(false);
                                    const params: any = { page: 1 };
                                    if (filters?.per_page) params.per_page = filters.per_page;
                                    if (filters?.sort_by) params.sort_by = filters.sort_by;
                                    if (filters?.sort_order) params.sort_order = filters.sort_order;
                                    router.get(route('invoices.index'), params, { preserveState: false, preserveScroll: false });
                                }}>
                                    {t('Reset Filters')}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Invoice Content */}
            {activeView === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {invoices?.data?.map((invoice: Invoice) => (
                        <Card key={invoice.id} className="overflow-hidden hover:shadow-md transition-shadow">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <CardTitle 
                                        className="text-base line-clamp-1 cursor-pointer hover:text-blue-600 transition-colors"
                                        onClick={() => handleAction('view', invoice)}
                                    >
                                        {invoice.invoice_number}
                                    </CardTitle>
                                    <div className="flex items-center gap-1">
                                        {invoice.is_overdue && <AlertTriangle className="h-4 w-4 text-red-500" />}
                                        <Badge className={getStatusColor(invoice.status)} variant="secondary">
                                            {invoice.status?.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <FileText className="h-4 w-4" />
                                    <span>{invoice.title}</span>
                                </div>
                            </CardHeader>
                            
                            <CardContent className="py-2">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">Amount:</span>
                                        <span className="font-medium">{formatCurrency(invoice.total_amount)}</span>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">Project:</span>
                                        <span className="text-sm">{invoice.project?.title || t('No Project')}</span>
                                    </div>
                                    
                                    {invoice.client && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-muted-foreground">Client:</span>
                                            <div className="flex items-center gap-1">
                                                <Avatar className="h-5 w-5">
                                                    <AvatarImage src={invoice.client.avatar} />
                                                    <AvatarFallback className="text-xs">
                                                        {invoice.client.name?.charAt(0)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm">{invoice.client.name}</span>
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            <span>Due: {new Date(invoice.due_date).toLocaleDateString()}</span>
                                        </div>
                                        {invoice.is_overdue && (
                                            <span className="text-red-600 font-medium">
                                                {invoice.days_overdue} days overdue
                                            </span>
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
                                            onClick={() => handleAction('view', invoice)}
                                            className="text-blue-500 hover:text-blue-700 h-8 w-8"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>View</TooltipContent>
                                </Tooltip>
                                
                                {userWorkspaceRole !== 'client' && (
                                    <>
                                        {invoice.status === 'draft' && ['owner', 'manager'].includes(userWorkspaceRole) && (
                                            <>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            onClick={() => handleAction('edit', invoice)}
                                                            className="text-amber-500 hover:text-amber-700 h-8 w-8"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Edit</TooltipContent>
                                                </Tooltip>
                                                
                                                {emailNotificationsEnabled && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                onClick={() => handleAction('send', invoice)}
                                                                className="text-blue-500 hover:text-blue-700 h-8 w-8"
                                                            >
                                                                <Send className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Send</TooltipContent>
                                                    </Tooltip>
                                                )}
                                                
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon"
                                                            className="text-red-500 hover:text-red-700 h-8 w-8"
                                                            onClick={() => handleAction('delete', invoice)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Delete</TooltipContent>
                                                </Tooltip>
                                            </>
                                        )}
                                        
                                        {invoice.status !== 'paid' && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        onClick={() => handleAction('copy-payment-link', invoice)}
                                                        className="text-purple-500 hover:text-purple-700 h-8 w-8"
                                                    >
                                                        <Link className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Copy Payment Link</TooltipContent>
                                            </Tooltip>
                                        )}
                                        
                                        {(invoice.status === 'sent' || invoice.status === 'viewed' || invoice.status === 'overdue') && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        onClick={() => handleAction('mark-paid', invoice)}
                                                        className="text-green-500 hover:text-green-700 h-8 w-8"
                                                    >
                                                        <DollarSign className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Mark as Paid</TooltipContent>
                                            </Tooltip>
                                        )}
                                    </>
                                )}
                                
                                {userWorkspaceRole === 'client' && invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => handleAction('pay', invoice)}
                                                className="text-blue-500 hover:text-blue-700 h-8 w-8"
                                            >
                                                <CreditCard className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>Pay Now</TooltipContent>
                                    </Tooltip>
                                )}
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow">
                    <CrudTable
                        columns={columns}
                        actions={actions}
                        data={invoices?.data || []}
                        from={invoices?.from || 1}
                        onAction={handleAction}
                        sortField={filters?.sort_by}
                        sortDirection={filters?.sort_order}
                        onSort={handleSort}
                        permissions={auth?.permissions || []}
                    />
                </div>
            )}

            {invoices?.data?.length === 0 && (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500 mb-4">No invoices found</p>
                    {userWorkspaceRole !== 'client' && (
                        <Button onClick={() => router.get(route('invoices.create'))}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create your first invoice
                        </Button>
                    )}
                </div>
            )}

            {/* Delete Modal */}
            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setInvoiceToDelete(null);
                }}
                onConfirm={handleDeleteConfirm}
                itemName={invoiceToDelete?.invoice_number || ''}
                entityName="invoice"
            />
            
            {/* Payment Modal */}
            {invoiceToPay && (
                <InvoicePaymentModal
                    invoice={invoiceToPay}
                    open={showPaymentModal}
                    onClose={() => {
                        setShowPaymentModal(false);
                        setInvoiceToPay(null);
                    }}
                    onSuccess={() => {
                        setShowPaymentModal(false);
                        setInvoiceToPay(null);
                        router.reload();
                    }}
                />
            )}

            {/* Pagination */}
            {invoices?.links && (
                <div className="mt-6 bg-white p-4 rounded-lg shadow flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Showing <span className="font-medium">{invoices?.from || 0}</span> to <span className="font-medium">{invoices?.to || 0}</span> of <span className="font-medium">{invoices?.total || 0}</span> invoices
                    </div>
                    
                    <div className="flex gap-1">
                        {invoices?.links?.map((link: any, i: number) => {
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

            {/* Mark as Paid Confirmation Modal */}
            <Dialog open={showMarkPaidModal} onOpenChange={setShowMarkPaidModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Mark Invoice as Paid')}</DialogTitle>
                    </DialogHeader>
                    <p>{t('Are you sure you want to mark invoice')} {invoiceToMarkPaid?.invoice_number} {t('as paid')}?</p>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={() => setShowMarkPaidModal(false)}>
                            {t('Cancel')}
                        </Button>
                        <Button onClick={handleMarkPaidConfirm}>
                            {t('Mark as Paid')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </PageTemplate>
    );
}