import { useState, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Search, Filter, Edit, Trash2, LayoutGrid, List, CheckCircle, XCircle } from 'lucide-react';
import { PageTemplate } from '@/components/page-template';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { CrudTable } from '@/components/CrudTable';
import { toast } from '@/components/custom-toast';
import { hasPermission } from '@/utils/authorization';
import { useTranslation } from 'react-i18next';

interface ContractType {
    id: number;
    name: string;
    description: string;
    color: string;
    is_active: boolean;
    sort_order: number;
    contracts_count: number;
    creator: {
        id: number;
        name: string;
    };
    created_at: string;
}

export default function ContractTypesIndex() {
    const { t } = useTranslation();
    const { auth, contractTypes, filters: pageFilters = {}, errors, flash } = usePage().props as any;
    const permissions = auth?.permissions || [];
    
    const [activeView, setActiveView] = useState(pageFilters.view_mode || 'grid');
    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || 'all');
    const [showFilters, setShowFilters] = useState(false);
    const [perPage, setPerPage] = useState(pageFilters.per_page?.toString() || '12');
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState<any>(null);
    const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');

    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };
    
    const applyFilters = () => {
        const params: any = { page: 1 };
        
        if (searchTerm) params.search = searchTerm;
        if (selectedStatus !== 'all') params.status = selectedStatus;
        if (perPage) params.per_page = perPage;
        if (pageFilters.sort_field) params.sort_field = pageFilters.sort_field;
        if (pageFilters.sort_direction) params.sort_direction = pageFilters.sort_direction;
        params.view_mode = activeView;
        
        router.get(route('contract-types.index'), params, { preserveState: false, preserveScroll: false });
    };
    
    // Add sorting functionality
    const handleSort = (field: string) => {
        const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';
        
        const params: any = { 
            sort_field: field, 
            sort_direction: direction, 
            page: 1 
        };
        
        // Preserve existing filters
        if (searchTerm) params.search = searchTerm;
        if (selectedStatus !== 'all') params.status = selectedStatus;
        if (perPage) params.per_page = perPage;
        params.view_mode = activeView;
        
        router.get(route('contract-types.index'), params, { preserveState: true, preserveScroll: true });
    };
    
    const handleResetFilters = () => {
        setSearchTerm('');
        setSelectedStatus('all');
        setShowFilters(false);
        const params: any = { page: 1 };
        if (perPage) params.per_page = perPage;
        params.view_mode = activeView;
        router.get(route('contract-types.index'), params, { preserveState: false, preserveScroll: false });
    };

    // Remove client-side filtering since we're using server-side filtering
    const filteredContractTypes = contractTypes?.data || [];

    const handleAction = (action: string, item: any) => {
        setCurrentItem(item);
        switch (action) {
            case 'edit':
                setFormMode('edit');
                setIsFormModalOpen(true);
                break;
            case 'delete':
                if (item.contracts_count > 0) {
                    toast.error(t('Cannot delete contract type that has contracts associated with it.'));
                    return;
                }
                setIsDeleteModalOpen(true);
                break;
            case 'toggle':
                router.put(route('contract-types.toggle-status', item.id));
                break;
        }
    };
    
    const handleAddNew = () => {
        setCurrentItem(null);
        setFormMode('create');
        setIsFormModalOpen(true);
    };
    
    const handleFormSubmit = (formData: any) => {
        if (formMode === 'create') {
            toast.loading(t('Creating contract type...'));
            router.post(route('contract-types.store'), formData, {
                onSuccess: () => {
                    setIsFormModalOpen(false);
                    toast.dismiss();
                },
                onError: (errors) => {
                    toast.dismiss();
                    toast.error(t('Failed to create contract type'));
                }
            });
        } else if (formMode === 'edit') {
            toast.loading(t('Updating contract type...'));
            router.put(route('contract-types.update', currentItem.id), formData, {
                onSuccess: () => {
                    setIsFormModalOpen(false);
                    toast.dismiss();
                },
                onError: (errors) => {
                    toast.dismiss();
                    toast.error(t('Failed to update contract type'));
                }
            });
        }
    };
    
    const handleDeleteConfirm = () => {
        toast.loading(t('Deleting contract type...'));
        router.delete(route('contract-types.destroy', currentItem.id), {
            onSuccess: () => {
                setIsDeleteModalOpen(false);
                toast.dismiss();
            },
            onError: (errors) => {
                toast.dismiss();
                toast.error(t('Failed to delete contract type'));
            }
        });
    };
    
    const hasActiveFilters = () => {
        return selectedStatus !== 'all' || searchTerm !== '';
    };
    
    const activeFilterCount = () => {
        return (selectedStatus !== 'all' ? 1 : 0) + (searchTerm ? 1 : 0);
    };

    const getStatusColor = (status: string) => {
        const colors = {
            active: 'bg-green-100 text-green-800 border-green-300',
            inactive: 'bg-red-100 text-red-800 border-red-300',
        };
        return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-300';
    };

    const getStatusBadge = (isActive: boolean) => {
        const status = isActive ? 'active' : 'inactive';
        return (
            <Badge className={getStatusColor(status)} variant="secondary">
                {isActive ? t('Active') : t('Inactive')}
            </Badge>
        );
    };

    const pageActions = [];
    
    if (hasPermission(permissions, 'contract_type_create')) {
        pageActions.push({
            label: t('Add Contract Type'),
            icon: <Plus className="h-4 w-4 mr-2" />,
            variant: 'default',
            onClick: handleAddNew
        });
    }
    
    const breadcrumbs = [
        { title: t('Dashboard'), href: route('dashboard') },
        { title: t('Contracts'), href: route('contracts.index') },
        { title: t('Contract Types') }
    ];
    
    return (
        <PageTemplate 
            title={t('Contract Types')} 
            url="/contract-types"
            actions={pageActions}
            breadcrumbs={breadcrumbs}
            noPadding
        >
            {/* Overview Row */}
            <Card className="mb-4 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                    <div className="grid grid-cols-4 gap-4">
                        <div className="text-center">
                            <div className="text-xl font-bold text-blue-600">
                                {contractTypes?.total || 0}
                            </div>
                            <div className="text-xs text-gray-600">{t('Total Types')}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl font-bold text-green-600">
                                {contractTypes?.data?.filter((type: any) => type.is_active).length || 0}
                            </div>
                            <div className="text-xs text-gray-600">{t('Active')}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl font-bold text-gray-600">
                                {contractTypes?.data?.filter((type: any) => !type.is_active).length || 0}
                            </div>
                            <div className="text-xs text-gray-600">{t('Inactive')}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl font-bold text-purple-600">
                                {contractTypes?.data?.reduce((sum: number, type: any) => sum + type.contracts_count, 0) || 0}
                            </div>
                            <div className="text-xs text-gray-600">{t('Total Contracts')}</div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Search and filters section */}
            <div className="bg-white rounded-lg shadow mb-4">
                <div className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <form onSubmit={handleSearch} className="flex gap-2">
                                <div className="relative w-64">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder={t('Search contract types...')}
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
                            
                            <div className="ml-2">
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
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <div className="border rounded-md p-0.5 mr-2">
                                <Button 
                                    size="sm" 
                                    variant={activeView === 'list' ? "default" : "ghost"}
                                    className="h-7 px-2"
                                    onClick={() => {
                                        setActiveView('list');
                                        const params: any = { view_mode: 'list' };
                                        if (searchTerm) params.search = searchTerm;
                                        if (selectedStatus !== 'all') params.status = selectedStatus;
                                        if (perPage) params.per_page = perPage;
                                        if (pageFilters.sort_field) params.sort_field = pageFilters.sort_field;
                                        if (pageFilters.sort_direction) params.sort_direction = pageFilters.sort_direction;
                                        router.get(route('contract-types.index'), params, { preserveState: true, preserveScroll: true });
                                    }}
                                >
                                    <List className="h-4 w-4" />
                                </Button>
                                <Button 
                                    size="sm" 
                                    variant={activeView === 'grid' ? "default" : "ghost"}
                                    className="h-7 px-2"
                                    onClick={() => {
                                        setActiveView('grid');
                                        const params: any = { view_mode: 'grid' };
                                        if (searchTerm) params.search = searchTerm;
                                        if (selectedStatus !== 'all') params.status = selectedStatus;
                                        if (perPage) params.per_page = perPage;
                                        if (pageFilters.sort_field) params.sort_field = pageFilters.sort_field;
                                        if (pageFilters.sort_direction) params.sort_direction = pageFilters.sort_direction;
                                        router.get(route('contract-types.index'), params, { preserveState: true, preserveScroll: true });
                                    }}
                                >
                                    <LayoutGrid className="h-4 w-4" />
                                </Button>
                            </div>
                            
                            <Label className="text-xs text-muted-foreground">{t('Per Page')}:</Label>
                            <Select 
                                value={perPage} 
                                onValueChange={(value) => {
                                    setPerPage(value);
                                    const params: any = { page: 1, per_page: parseInt(value) };
                                    if (searchTerm) params.search = searchTerm;
                                    if (selectedStatus !== 'all') params.status = selectedStatus;
                                    if (pageFilters.sort_field) params.sort_field = pageFilters.sort_field;
                                    if (pageFilters.sort_direction) params.sort_direction = pageFilters.sort_direction;
                                    params.view_mode = activeView;
                                    router.get(route('contract-types.index'), params, { preserveState: false, preserveScroll: false });
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
                                    <Label>{t('Status')}</Label>
                                    <Select value={selectedStatus} onValueChange={(value) => {
                                        setSelectedStatus(value);
                                        const params: any = { page: 1 };
                                        if (searchTerm) params.search = searchTerm;
                                        if (value !== 'all') params.status = value;
                                        if (perPage) params.per_page = perPage;
                                        if (pageFilters.sort_field) params.sort_field = pageFilters.sort_field;
                                        if (pageFilters.sort_direction) params.sort_direction = pageFilters.sort_direction;
                                        params.view_mode = activeView;
                                        router.get(route('contract-types.index'), params, { preserveState: false, preserveScroll: false });
                                    }}>
                                        <SelectTrigger className="w-40">
                                            <SelectValue placeholder={t('All Status')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('All Status')}</SelectItem>
                                            <SelectItem value="active">{t('Active')}</SelectItem>
                                            <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="h-9"
                                    onClick={handleResetFilters}
                                    disabled={!hasActiveFilters()}
                                >
                                    {t('Reset Filters')}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>


            {/* Contract Types Content */}
            {(activeView === 'grid' || !activeView) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredContractTypes.map((type: any) => (
                    <Card key={type.id} className="overflow-hidden hover:shadow-md transition-shadow h-48 flex flex-col">
                        <CardHeader className="pb-2 flex-1">
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-base line-clamp-1 flex items-center gap-2">
                                    <div 
                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: type.color }}
                                    />
                                    {type.name}
                                </CardTitle>
                                <div className="flex gap-1">
                                    {getStatusBadge(type.is_active)}
                                </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                                {t('By')} {type.creator?.name}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{type.description}</p>
                        </CardHeader>
                        
                        <CardFooter className="flex justify-end gap-1 pt-0 pb-2 mt-auto">
                            {hasPermission(permissions, 'contract_type_update') && (
                                <>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => handleAction('toggle', type)}
                                                className={type.is_active ? "text-red-500 hover:text-red-700 h-8 w-8" : "text-green-500 hover:text-green-700 h-8 w-8"}
                                            >
                                                {type.is_active ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>{type.is_active ? t('Deactivate') : t('Activate')}</TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => handleAction('edit', type)}
                                                className="text-amber-500 hover:text-amber-700 h-8 w-8"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>{t('Edit')}</TooltipContent>
                                    </Tooltip>
                                </>
                            )}
                            {hasPermission(permissions, 'contract_type_delete') && (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button 
                                            variant="ghost" 
                                            size="icon"
                                            className="text-red-500 hover:text-red-700 h-8 w-8"
                                            onClick={() => handleAction('delete', type)}
                                            disabled={type.contracts_count > 0}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        {type.contracts_count > 0 ? t('Cannot delete - has contracts') : t('Delete')}
                                    </TooltipContent>
                                </Tooltip>
                            )}
                        </CardFooter>
                    </Card>
                ))}
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <CrudTable
                        columns={[
                            {
                                key: 'name',
                                label: t('Name'),
                                sortable: true,
                                render: (value: string, row: any) => (
                                    <div className="flex items-center gap-2">
                                        <div 
                                            className="w-3 h-3 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: row.color }}
                                        />
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">{value}</div>
                                            <div className="text-xs text-gray-500">
                                                {t('By')} {row.creator?.name}
                                            </div>
                                        </div>
                                    </div>
                                )
                            },
                            {
                                key: 'description',
                                label: t('Description'),
                                sortable: true,
                                render: (value: string) => (
                                    <div className="text-sm text-gray-500 max-w-xs truncate">
                                        {value || '-'}
                                    </div>
                                )
                            },
                            {
                                key: 'contracts_count',
                                label: t('Contracts'),
                                sortable: false,
                                render: (value: number) => (
                                    <span className="text-sm font-medium text-blue-600">
                                        {value || 0}
                                    </span>
                                )
                            },
                            {
                                key: 'is_active',
                                label: t('Status'),
                                sortable: true,
                                render: (value: boolean) => getStatusBadge(value)
                            }
                        ]}
                        actions={[
                            {
                                label: t('Toggle Status'),
                                action: 'toggle',
                                condition: () => hasPermission(permissions, 'contract_type_update'),
                                render: (row: any) => (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => handleAction('toggle', row)}
                                                className={row.is_active ? "text-green-500 hover:text-green-700 h-8 w-8" : "text-red-500 hover:text-red-700 h-8 w-8"}
                                            >
                                                {row.is_active ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>{row.is_active ? t('Deactivate') : t('Activate')}</TooltipContent>
                                    </Tooltip>
                                )
                            },
                            {
                                label: t('Edit'),
                                icon: 'Edit',
                                action: 'edit',
                                className: 'text-amber-500 hover:text-amber-700',
                                condition: () => hasPermission(permissions, 'contract_type_update')
                            },
                            {
                                label: t('Delete'),
                                icon: 'Trash2',
                                action: 'delete',
                                className: 'text-red-500 hover:text-red-700',
                                condition: (row: any) => hasPermission(permissions, 'contract_type_delete') && row.contracts_count === 0
                            }
                        ]}
                        data={filteredContractTypes}
                        from={contractTypes?.from || 1}
                        onAction={handleAction}
                        sortField={pageFilters.sort_field}
                        sortDirection={pageFilters.sort_direction}
                        onSort={handleSort}
                        permissions={permissions}
                    />
                    
                    {/* Pagination for list view */}
                    {contractTypes?.links && (
                        <div className="p-4 border-t flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                                {t('Showing')} <span className="font-medium">{contractTypes?.from || 0}</span> {t('to')} <span className="font-medium">{contractTypes?.to || 0}</span> {t('of')} <span className="font-medium">{contractTypes?.total || 0}</span> {t('contract types')}
                            </div>
                            
                            <div className="flex gap-1">
                                {contractTypes?.links?.map((link: any, i: number) => {
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
                                            {isTextLink ? t(label) : <span dangerouslySetInnerHTML={{ __html: link.label }} />}
                                        </Button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Pagination for grid view */}
            {activeView === 'grid' && contractTypes?.links && filteredContractTypes.length > 0 && (
                <div className="mt-6 bg-white p-4 rounded-lg shadow flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        {t('Showing')} <span className="font-medium">{contractTypes?.from || 0}</span> {t('to')} <span className="font-medium">{contractTypes?.to || 0}</span> {t('of')} <span className="font-medium">{contractTypes?.total || 0}</span> {t('contract types')}
                    </div>
                    
                    <div className="flex gap-1">
                        {contractTypes?.links?.map((link: any, i: number) => {
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
            
            {/* Form Modal */}
            <CrudFormModal
                isOpen={isFormModalOpen}
                onClose={() => setIsFormModalOpen(false)}
                onSubmit={handleFormSubmit}
                submitButtonText={formMode === 'create' ? t('Create Contract Type') : t('Update Contract Type')}
                formConfig={{
                    fields: [
                        { name: 'name', label: t('Name'), type: 'text', required: true },
                        { name: 'description', label: t('Description'), type: 'textarea' },
                        { 
                            name: 'color', 
                            label: t('Color'), 
                            type: 'custom',
                            render: (field: any, formData: any, handleChange: any) => {
                                const value = formData[field.name] || '#007bff';
                                return (
                                    <div className="space-y-2">
                                        <Label>{t('Color')}</Label>
                                        <div className="flex gap-2 items-center">
                                            <div 
                                                className="w-8 h-8 rounded border-2 border-gray-300"
                                                style={{ backgroundColor: value }}
                                            />
                                            <input
                                                type="color"
                                                value={value}
                                                onChange={(e) => handleChange(field.name, e.target.value)}
                                                className="w-12 h-8 rounded border cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                );
                            },
                            required: true
                        },
                        { name: 'is_active', label: '', type: 'checkbox', placeholder: t('Active') }
                    ],
                    modalSize: 'lg'
                }}
                initialData={currentItem || {
                    color: '#007bff',
                    is_active: true
                }}
                title={
                    formMode === 'create' 
                        ? t('Add Contract Type') 
                        : t('Edit Contract Type')
                }
                mode={formMode}
            />

            {/* Delete Modal */}
            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={currentItem?.name || ''}
                entityName={t('contract type')}
                warningMessage={t('This contract type will be permanently deleted.')}
                additionalInfo={[
                    t('This action cannot be undone'),
                    t('Make sure no contracts are using this type')
                ]}
            />
        </PageTemplate>
    );
}