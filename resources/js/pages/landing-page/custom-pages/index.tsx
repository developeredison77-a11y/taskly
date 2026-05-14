import React, { useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Search } from 'lucide-react';
import { PageTemplate } from '@/components/page-template';
import { CrudTable } from '@/components/CrudTable';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { CrudDeleteModal } from '@/components/CrudDeleteModal';
import { columnRenderers } from '@/utils/columnRenderers';
import { hasPermission } from '@/utils/authorization';

declare const route: any;

interface CustomPage {
  id: number;
  title: string;
  slug: string;
  content: string;
  meta_title?: string;
  meta_description?: string;
  is_active: boolean;
  sort_order: number;
}

export default function CustomPagesIndex() {
  const { t } = useTranslation();
  const { auth, pages, filters: pageFilters = {} } = usePage<any>().props;
  const permissions = auth?.permissions || [];
  const [deletingPage, setDeletingPage] = useState<CustomPage | null>(null);
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');

  const handleDelete = (page: CustomPage) => {
    setDeletingPage(page);
  };

  const confirmDelete = () => {
    if (deletingPage) {
      router.delete(route('landing-page.custom-pages.destroy', deletingPage.id), {
        onSuccess: () => {
          toast.success(t('Page deleted successfully!'));
          setDeletingPage(null);
        },
        onError: () => {
          toast.error(t('Failed to delete page. Please try again.'));
        }
      });
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params: any = { page: 1 };
    if (searchTerm) {
      params.search = searchTerm;
    }
    router.get(route('landing-page.custom-pages.index'), params, { preserveState: true, preserveScroll: true });
  };

  const handleAction = (action: string, item: CustomPage) => {
    if (action === 'delete') {
      handleDelete(item);
    }
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
    router.get(route('landing-page.custom-pages.index'), params, { preserveState: true, preserveScroll: true });
  };

  const columns = [
    {
      key: 'title',
      label: t('Title'),
      sortable: true,
      render: (value: string) => (
        <div className="font-medium">{value}</div>
      )
    },
    {
      key: 'content',
      label: t('Content'),
      render: (value: string) => {
        const strippedContent = value.replace(/<[^>]*>/g, '');
        return (
          <div className="max-w-xs truncate" title={strippedContent}>
            {strippedContent.substring(0, 100)}...
          </div>
        );
      }
    },
    {
      key: 'is_active',
      label: t('Status'),
      render: (value: boolean) => {
        const statusValue = value ? 'active' : 'inactive';
        const statusRenderer = columnRenderers.status({
          active: 'bg-green-100 text-green-800 border border-green-300',
          inactive: 'bg-red-100 text-gray-800 border border-red-300'
        });
        return statusRenderer(statusValue);
      }
    }
  ];

  const actions = [
    {
      label: t('Edit'),
      icon: 'Edit',
      href: (item: CustomPage) => route('landing-page.custom-pages.edit', item.id),
      className: 'text-amber-500 hover:text-amber-700',
      requiredPermission: 'custom_page_update'
    },
    {
      label: t('Delete'),
      icon: 'Trash2',
      action: 'delete',
      className: 'text-red-500 hover:text-red-700',
      requiredPermission: 'custom_page_delete'
    }
  ];

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Landing Page'), href: route('landing-page.settings') },
    { title: t('Custom Pages') }
  ];

  return (
    <PageTemplate
      title={t('Custom Pages')}
      description={t('Manage your landing page custom pages')}
      url="/landing-page/custom-pages"
      breadcrumbs={breadcrumbs}
      actions={hasPermission(permissions, 'custom_page_create') ? [
        {
          label: t('Add Page'),
          icon: <Plus className="w-4 h-4 mr-2" />,
          variant: 'default',
          onClick: () => router.get(route('landing-page.custom-pages.create'))
        }
      ] : []}
      noPadding
    >
      {/* Search and filters section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-4">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('Search pages...')}
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
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">{t('Per Page')}:</Label>
              <Select
                value={pageFilters.per_page?.toString() || "10"}
                onValueChange={(value) => {
                  const params: any = { page: 1, per_page: parseInt(value) };
                  if (searchTerm) params.search = searchTerm;
                  router.get(route('landing-page.custom-pages.index'), params, { preserveState: true, preserveScroll: true });
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
        </div>
      </div>

      {/* Table section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
        <CrudTable
          columns={columns}
          actions={actions}
          data={pages?.data || pages || []}
          from={pages?.from || 1}
          onAction={handleAction}
          sortField={pageFilters.sort_field}
          sortDirection={pageFilters.sort_direction}
          onSort={handleSort}
          permissions={permissions}
          entityPermissions={{
            view: 'custom_page_view',
            edit: 'custom_page_update',
            delete: 'custom_page_delete'
          }}
        />

        {/* Pagination section */}
        {pages?.links && (
          <div className="p-4 border-t flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {t('Showing')} <span className="font-medium">{pages?.from || 0}</span> {t('to')} <span className="font-medium">{pages?.to || 0}</span> {t('of')} <span className="font-medium">{pages?.total || 0}</span> {t('pages')}
            </div>

            <div className="flex gap-1">
              {pages?.links?.map((link: any, i: number) => {
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

      <CrudDeleteModal
        isOpen={!!deletingPage}
        onClose={() => setDeletingPage(null)}
        onConfirm={confirmDelete}
        itemName={deletingPage?.title || ''}
        entityName={t('Page')}
      />
    </PageTemplate>
  );
}