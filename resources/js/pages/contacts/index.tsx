import { useState, useEffect } from 'react';
import { PageTemplate } from '@/components/page-template';
import { usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, Search, Plus, Edit, Trash2, Download, Eye } from 'lucide-react';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { DatePicker } from '@/components/ui/date-picker';
import { CrudFormModal } from '@/components/CrudFormModal';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { CrudTable } from '@/components/CrudTable';
import { type PageAction } from '@/types';

declare const route: any;

export default function Contacts() {
  const { t } = useTranslation();
  const { auth, contacts, filters: pageFilters = {}, flash } = usePage().props as any;

  // State
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [startDate, setStartDate] = useState<Date | undefined>(pageFilters.start_date ? new Date(pageFilters.start_date) : undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(pageFilters.end_date ? new Date(pageFilters.end_date) : undefined);
  const [showFilters, setShowFilters] = useState(false);

  // Modal state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentContact, setCurrentContact] = useState<any>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create');

  // Handle flash messages
  useEffect(() => {
    if (flash?.success) {
      toast.success(flash.success);
    }
    if (flash?.error) {
      toast.error(flash.error);
    }
  }, [flash]);

  // Check if any filters are active
  const hasActiveFilters = () => {
    return searchTerm !== '' || startDate !== undefined || endDate !== undefined;
  };

  // Count active filters
  const activeFilterCount = () => {
    return (searchTerm ? 1 : 0) +
      (startDate ? 1 : 0) +
      (endDate ? 1 : 0);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  // Apply filters immediately when date changes
  const handleDateFilterChange = (type: 'start' | 'end', date: Date | undefined) => {
    if (type === 'start') {
      setStartDate(date);
    } else {
      setEndDate(date);
    }

    const params: any = { page: 1 };

    if (searchTerm) {
      params.search = searchTerm;
    }

    if (type === 'start') {
      if (date) {
        params.start_date = date.toISOString().split('T')[0];
      }
      if (endDate) {
        params.end_date = endDate.toISOString().split('T')[0];
      }
    } else {
      if (startDate) {
        params.start_date = startDate.toISOString().split('T')[0];
      }
      if (date) {
        params.end_date = date.toISOString().split('T')[0];
      }
    }

    if (pageFilters.per_page) {
      params.per_page = pageFilters.per_page;
    }

    router.get(route('contacts.index'), params, { preserveState: true, preserveScroll: true });
  };





  const applyFilters = () => {
    const params: any = { page: 1 };

    if (searchTerm) {
      params.search = searchTerm;
    }

    if (startDate) {
      params.start_date = startDate.toISOString().split('T')[0];
    }

    if (endDate) {
      params.end_date = endDate.toISOString().split('T')[0];
    }

    if (pageFilters.per_page) {
      params.per_page = pageFilters.per_page;
    }

    router.get(route('contacts.index'), params, { preserveState: true, preserveScroll: true });
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';

    const params: any = {
      sort_field: field,
      sort_direction: direction,
      page: 1
    };

    if (searchTerm) {
      params.search = searchTerm;
    }

    if (startDate) {
      params.start_date = startDate.toISOString().split('T')[0];
    }

    if (endDate) {
      params.end_date = endDate.toISOString().split('T')[0];
    }

    if (pageFilters.per_page) {
      params.per_page = pageFilters.per_page;
    }

    router.get(route('contacts.index'), params, { preserveState: true, preserveScroll: true });
  };

  const handleAddNew = () => {
    setCurrentContact(null);
    setFormMode('create');
    setIsFormModalOpen(true);
  };

  const handleEdit = (contact: any) => {
    setCurrentContact(contact);
    setFormMode('edit');
    setIsFormModalOpen(true);
  };

  const handleView = (contact: any) => {
    setCurrentContact(contact);
    setFormMode('view');
    setIsFormModalOpen(true);
  };

  const handleDelete = (contact: any) => {
    setCurrentContact(contact);
    setIsDeleteModalOpen(true);
  };

  const handleFormSubmit = (formData: any) => {
    if (formMode === 'create') {
      toast.loading(t('Creating contact...'));

      router.post(route('contacts.store'), formData, {
        onSuccess: () => {
          setIsFormModalOpen(false);
          toast.dismiss();
        },
        onError: (errors) => {
          toast.dismiss();
          toast.error(t('Failed to create contact'));
        }
      });
    } else if (formMode === 'edit') {
      toast.loading(t('Updating contact...'));

      router.put(route('contacts.update', currentContact.id), formData, {
        onSuccess: () => {
          setIsFormModalOpen(false);
          toast.dismiss();
        },
        onError: (errors) => {
          toast.dismiss();
          toast.error(t('Failed to update contact'));
        }
      });
    }
  };

  const handleDeleteConfirm = () => {
    toast.loading(t('Deleting contact...'));

    router.delete(route('contacts.destroy', currentContact.id), {
      onSuccess: () => {
        setIsDeleteModalOpen(false);
        toast.dismiss();
      },
      onError: () => {
        toast.dismiss();
        toast.error(t('Failed to delete contact'));
      }
    });
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStartDate(undefined);
    setEndDate(undefined);
    setShowFilters(false);

    router.get(route('contacts.index'), {
      page: 1,
      per_page: pageFilters.per_page
    }, { preserveState: true, preserveScroll: true });
  };

  const handleAction = (action: string, item: any) => {
    if (action === 'view') {
      handleView(item);
    } else if (action === 'edit') {
      handleEdit(item);
    } else if (action === 'delete') {
      handleDelete(item);
    }
  };

  const actions = [
    {
      label: t('View'),
      icon: 'Eye',
      action: 'view',
      className: 'text-blue-500 hover:text-blue-700'
    },
    {
      label: t('Delete'),
      icon: 'Trash2',
      action: 'delete',
      className: 'text-red-500 hover:text-red-700'
    }
  ];

  const handleExport = () => {
    const params = new URLSearchParams();

    if (searchTerm) params.append('search', searchTerm);
    if (startDate) params.append('start_date', startDate.toISOString().split('T')[0]);
    if (endDate) params.append('end_date', endDate.toISOString().split('T')[0]);

    window.open(route('contacts.export') + '?' + params.toString());
  };



  const pageActions: PageAction[] = [
    {
      label: t('Export'),
      icon: <Download className="h-4 w-4 mr-2" />,
      variant: 'outline',
      onClick: handleExport
    },
  ];

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Landing Page'), href: route('landing-page.settings') },
    { title: t('Contact Inquiries') }
  ];

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
    {
      key: 'subject',
      label: t('Subject'),
      sortable: true,
      render: (value: string) => (
        <div className="max-w-xs truncate" title={value}>
          {value}
        </div>
      )
    },
    {
      key: 'created_at',
      label: t('Created At'),
      sortable: true,
      render: (value: string) => window.appSettings?.formatDateTime(value, false) || new Date(value).toLocaleDateString()
    }
  ];

  return (
    <PageTemplate
      title={t("Contact Inquiries")}
      description={t("Manage your incoming contact inquiries")}
      url="/contacts"
      actions={pageActions}
      breadcrumbs={breadcrumbs}
      noPadding
    >
      {/* Search and filters section */}
      <div className="bg-white rounded-lg shadow mb-4">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t("Search contacts...")}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9"
                  />
                </div>
                <Button type="submit" size="sm">
                  <Search className="h-4 w-4 mr-1.5" />
                  {t("Search")}
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
              <Label className="text-xs text-muted-foreground">{t("Per Page:")}</Label>
              <Select
                value={pageFilters.per_page?.toString() || "10"}
                onValueChange={(value) => {
                  const params: any = { page: 1, per_page: parseInt(value) };

                  if (searchTerm) params.search = searchTerm;
                  if (startDate) params.start_date = startDate.toISOString().split('T')[0];
                  if (endDate) params.end_date = endDate.toISOString().split('T')[0];

                  router.get(route('contacts.index'), params, { preserveState: true, preserveScroll: true });
                }}
              >
                <SelectTrigger className="w-16 h-8">
                  <SelectValue />
                </SelectTrigger>
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
                  <Label>{t("Start Date")}</Label>
                  <DatePicker
                    selected={startDate}
                    onSelect={(date) => handleDateFilterChange('start', date)}
                    onChange={(date) => handleDateFilterChange('start', date)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("End Date")}</Label>
                  <DatePicker
                    selected={endDate}
                    onSelect={(date) => handleDateFilterChange('end', date)}
                    onChange={(date) => handleDateFilterChange('end', date)}
                  />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={handleResetFilters}
                  disabled={!hasActiveFilters()}
                >
                  {t("Reset Filters")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content section */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <CrudTable
          columns={columns}
          actions={actions}
          data={contacts?.data || []}
          from={contacts?.from || 1}
          onAction={handleAction}
          sortField={pageFilters.sort_field}
          sortDirection={pageFilters.sort_direction}
          onSort={handleSort}
          permissions={[]}
        />

        {/* Pagination section */}
        {contacts?.links && (
          <div className="p-4 border-t flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {t("Showing")} <span className="font-medium">{contacts?.from || 0}</span> {t("to")} <span className="font-medium">{contacts?.to || 0}</span> {t("of")} <span className="font-medium">{contacts?.total || 0}</span> {t("contacts")}
            </div>

            <div className="flex gap-1">
              {contacts?.links?.map((link: any, i: number) => {
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
      </div>

      {/* Form Modal */}
      <CrudFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        submitButtonText={formMode === 'create' ? t('Create Contact') : t('Update Contact')}
        formConfig={{
          fields: [
            { name: 'name', label: t('Name'), type: 'text', required: formMode !== 'view' },
            { name: 'email', label: t('Email'), type: 'email', required: formMode !== 'view' },
            { name: 'subject', label: t('Subject'), type: 'text', required: formMode !== 'view' },
            { name: 'message', label: t('Message'), type: 'textarea', required: formMode !== 'view' },
            ...(formMode === 'view' ? [{ name: 'created_at', label: t('Date'), type: 'text', readOnly: true }] : [])
          ],
          modalSize: 'lg'
        }}
        initialData={{
          ...currentContact,
          created_at: currentContact?.created_at ? new Date(currentContact.created_at).toLocaleDateString() : ''
        }}
        title={
          formMode === 'create'
            ? t('Add Contact Inquiry')
            : formMode === 'view'
              ? t('View Contact Inquiry Details')
              : t('Edit Contact Inquiry')
        }
        mode={formMode}
      />

      {/* Delete Modal */}
      <CrudDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        itemName={currentContact?.name || ''}
        entityName="contact"
      />
    </PageTemplate>
  );
}
