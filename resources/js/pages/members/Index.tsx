/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Plus } from 'lucide-react';
import { PageTemplate } from '@/components/page-template';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { CrudTable } from '@/components/CrudTable';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';

export default function MembersIndex() {
    const { t } = useTranslation();
    const { members, workspaces = [], filters: pageFilters = {}, flash, permissions: pagePermissions, errors } = usePage().props as any;

    const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
    const [selectedStatus, setSelectedStatus] = useState(pageFilters.status || 'all');
    const [showFilters, setShowFilters] = useState(false);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [currentMember, setCurrentMember] = useState<any>(null);
    const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    const hasActiveFilters = () => searchTerm !== '' || selectedStatus !== 'all';
    const activeFilterCount = () => (searchTerm ? 1 : 0) + (selectedStatus !== 'all' ? 1 : 0);

    const applyFilters = () => {
        const params: any = { page: 1 };
        if (searchTerm) params.search = searchTerm;
        if (selectedStatus !== 'all') params.status = selectedStatus;
        if (pageFilters.per_page) params.per_page = pageFilters.per_page;
        if (pageFilters.sort_field) params.sort_field = pageFilters.sort_field;
        if (pageFilters.sort_direction) params.sort_direction = pageFilters.sort_direction;
        router.get(route('members.index'), params, { preserveState: true, preserveScroll: true });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const handleSort = (field: string) => {
        const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';
        const params: any = { sort_field: field, sort_direction: direction, page: 1 };
        if (searchTerm) params.search = searchTerm;
        if (selectedStatus !== 'all') params.status = selectedStatus;
        if (pageFilters.per_page) params.per_page = pageFilters.per_page;
        router.get(route('members.index'), params, { preserveState: true, preserveScroll: true });
    };

    const handleResetFilters = () => {
        setSearchTerm('');
        setSelectedStatus('all');
        setShowFilters(false);
        router.get(route('members.index'), { page: 1, per_page: pageFilters.per_page }, { preserveState: true, preserveScroll: true });
    };

    const handleAction = (action: string, item: any) => {
        setCurrentMember({
            ...item,
            workspace_ids: (item.workspaces || []).map((workspace: any) => String(workspace.id))
        });
        if (action === 'edit') {
            setFormMode('edit');
            setIsFormModalOpen(true);
        } else if (action === 'delete') {
            setIsDeleteModalOpen(true);
        } else if (action === 'toggle') {
            router.put(route('members.toggle-status', item.id));
        }
    };

    const handleFormSubmit = (formData: any) => {
        if (formMode === 'create') {
            toast.loading(t('Creating member...'));
            router.post(route('members.store'), formData, {
                onSuccess: () => {
                    toast.dismiss();
                    setIsFormModalOpen(false);
                },
                onError: (validationErrors: Record<string, string>) => {
                    toast.dismiss();
                    const firstError = Object.values(validationErrors || {})[0];
                    toast.error(firstError || t('Failed to create member'));
                }
            });
            return;
        }

        toast.loading(t('Updating member...'));
        router.put(route('members.update', currentMember.id), formData, {
            onSuccess: () => {
                toast.dismiss();
                setIsFormModalOpen(false);
            },
            onError: (validationErrors: Record<string, string>) => {
                toast.dismiss();
                const firstError = Object.values(validationErrors || {})[0];
                toast.error(firstError || t('Failed to update member'));
            }
        });
    };

    const handleDeleteConfirm = () => {
        toast.loading(t('Deleting member...'));
        router.delete(route('members.destroy', currentMember.id), {
            onSuccess: () => {
                toast.dismiss();
                setIsDeleteModalOpen(false);
            },
            onError: () => {
                toast.dismiss();
                toast.error(t('Failed to delete member'));
            }
        });
    };

    const actions: any[] = [];
    if (pagePermissions?.update) {
        actions.push({
            label: t('Edit'),
            icon: 'Edit',
            action: 'edit',
            className: 'text-amber-500 hover:text-amber-700'
        });
        actions.push({
            label: t('Toggle Status'),
            icon: 'RefreshCcw',
            action: 'toggle',
            className: 'text-blue-500 hover:text-blue-700'
        });
    }
    if (pagePermissions?.delete) {
        actions.push({
            label: t('Delete'),
            icon: 'Trash2',
            action: 'delete',
            className: 'text-red-500 hover:text-red-700'
        });
    }

    const columns = [
        {
            key: 'name',
            label: t('Name'),
            sortable: true,
            render: (value: string, row: any) => (
                <div>
                    <div className="font-medium">{value}</div>
                    <div className="text-sm text-muted-foreground">{row.email}</div>
                </div>
            )
        },
        { key: 'phone', label: t('Phone'), sortable: true },
        {
            key: 'status',
            label: t('Status'),
            sortable: true,
            render: (value: string) => (
                <span className={value === 'active' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                    {value === 'active' ? t('Active') : t('Inactive')}
                </span>
            )
        },
        {
            key: 'created_at',
            label: t('Created At'),
            sortable: true,
            render: (value: string) => window.appSettings?.formatDateTime(value, false) || new Date(value).toLocaleDateString()
        }
    ];

    const pageActions: any[] = [];
    if (pagePermissions?.create) {
        pageActions.push({
            label: t('Add Member'),
            icon: <Plus className="h-4 w-4 mr-2" />,
            variant: 'default',
            onClick: () => {
                setCurrentMember(null);
                setFormMode('create');
                setIsFormModalOpen(true);
            }
        });
    }

    return (
        <PageTemplate
            title={t('Members')}
            url="/members"
            actions={pageActions}
            breadcrumbs={[{ title: t('Dashboard'), href: route('dashboard') }, { title: t('Members') }]}
            noPadding
        >
            <div className="bg-white rounded-lg shadow mb-4">
                <div className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <form onSubmit={handleSearch} className="flex gap-2">
                                <div className="relative w-64">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9" placeholder={t('Search members...')} />
                                </div>
                                <Button type="submit" size="sm"><Search className="h-4 w-4 mr-1.5" />{t('Search')}</Button>
                            </form>
                            <Button variant={hasActiveFilters() ? 'default' : 'outline'} size="sm" className="h-8 px-2 py-1 ml-2" onClick={() => setShowFilters(!showFilters)}>
                                <Filter className="h-3.5 w-3.5 mr-1.5" />
                                {showFilters ? t('Hide Filters') : t('Filters')}
                                {hasActiveFilters() && <span className="ml-1 bg-primary-foreground text-primary rounded-full w-5 h-5 flex items-center justify-center text-xs">{activeFilterCount()}</span>}
                            </Button>
                        </div>
                        <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground">{t('Per Page:')}</Label>
                            <Select value={pageFilters.per_page?.toString() || '10'} onValueChange={(value) => {
                                const params: any = { page: 1, per_page: parseInt(value) };
                                if (searchTerm) params.search = searchTerm;
                                if (selectedStatus !== 'all') params.status = selectedStatus;
                                router.get(route('members.index'), params, { preserveState: true, preserveScroll: true });
                            }}>
                                <SelectTrigger className="w-16 h-8"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="25">25</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
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
                                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                                        <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">{t('All')}</SelectItem>
                                            <SelectItem value="active">{t('Active')}</SelectItem>
                                            <SelectItem value="inactive">{t('Inactive')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button size="sm" onClick={applyFilters}>{t('Apply')}</Button>
                                <Button variant="outline" size="sm" onClick={handleResetFilters} disabled={!hasActiveFilters()}>{t('Reset Filters')}</Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <CrudTable
                    columns={columns}
                    actions={actions}
                    data={members?.data || []}
                    from={members?.from || 1}
                    onAction={handleAction}
                    sortField={pageFilters.sort_field}
                    sortDirection={pageFilters.sort_direction}
                    onSort={handleSort}
                    permissions={[]}
                />

                {members?.links && (
                    <div className="p-4 border-t flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                            {t('Showing')} <span className="font-medium">{members?.from || 0}</span> {t('to')} <span className="font-medium">{members?.to || 0}</span> {t('of')} <span className="font-medium">{members?.total || 0}</span> {t('members')}
                        </div>
                        <div className="flex gap-1">
                            {members.links.map((link: any, i: number) => {
                                const isTextLink = link.label === '&laquo; Previous' || link.label === 'Next &raquo;';
                                const label = link.label.replace('&laquo; ', '').replace(' &raquo;', '');
                                return (
                                    <Button
                                        key={i}
                                        variant={link.active ? 'default' : 'outline'}
                                        size={isTextLink ? 'sm' : 'icon'}
                                        className={isTextLink ? 'px-3' : 'h-8 w-8'}
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
            </div>

            <CrudFormModal
                isOpen={isFormModalOpen}
                onClose={() => setIsFormModalOpen(false)}
                onSubmit={handleFormSubmit}
                externalErrors={errors}
                submitButtonText={formMode === 'create' ? t('Create Member') : t('Update Member')}
                title={formMode === 'create' ? t('Add Member') : t('Edit Member')}
                mode={formMode}
                initialData={currentMember || {}}
                formConfig={{
                    fields: [
                        { name: 'name', label: t('Name'), type: 'text', required: true },
                        { name: 'email', label: t('Email'), type: 'email', required: true },
                        {
                            name: 'workspace_ids',
                            label: t('Workspaces'),
                            type: 'multi-select',
                            required: true,
                            options: workspaces.map((workspace: any) => ({
                                label: workspace.name,
                                value: String(workspace.id),
                            })),
                        },
                        {
                            name: 'phone',
                            label: t('Phone'),
                            type: 'text',
                            required: true,
                            render: (field: any, formData: any, handleChange: any) => (
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    placeholder={t('Phone')}
                                    value={formData[field.name] || ''}
                                    onKeyDown={(e) => {
                                        if (['e', 'E', '+', '-', '.'].includes(e.key)) {
                                            e.preventDefault();
                                        }
                                    }}
                                    onChange={(e) => {
                                        const digitsOnly = e.target.value.replace(/\D/g, '');
                                        handleChange(field.name, digitsOnly);
                                    }}
                                />
                            )
                        },
                        {
                            name: 'status',
                            label: t('Status'),
                            type: 'select',
                            required: true,
                            options: [
                                { label: t('Active'), value: 'active' },
                                { label: t('Inactive'), value: 'inactive' },
                            ],
                            defaultValue: 'active'
                        },
                        { name: 'address', label: t('Address'), type: 'textarea' },
                        { name: 'notes', label: t('Notes'), type: 'textarea' },
                    ],
                    modalSize: 'lg'
                }}
            />

            <CrudDeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                itemName={currentMember?.name || ''}
                entityName="member"
            />
        </PageTemplate>
    );
}

