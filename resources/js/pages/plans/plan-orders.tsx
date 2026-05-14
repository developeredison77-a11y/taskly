import { PageTemplate } from '@/components/page-template';
import { CrudTable } from '@/components/CrudTable';
import { planOrdersConfig } from '@/config/crud/plan-orders';
import { useEffect, useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import { toast } from '@/components/custom-toast';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export default function PlanOrdersPage() {
  const { t } = useTranslation();
  const { flash, planOrders, filters: pageFilters = {}, auth, isMyOrders = false } = usePage().props as any;
  const permissions = auth?.permissions || [];
  const userRole = auth.user?.type || auth.user?.role;
  
  const [searchTerm, setSearchTerm] = useState(pageFilters.search || '');
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingOrder, setRejectingOrder] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  useEffect(() => {
    if (flash?.success) {
      toast.success(flash.success);
    }
    if (flash?.error) {
      toast.error(flash.error);
    }
  }, [flash]);

  useEffect(() => {
    const initialFilters: Record<string, any> = {};
    planOrdersConfig.filters?.forEach(filter => {
      initialFilters[filter.key] = pageFilters[filter.key] || 'all';
    });
    setFilterValues(initialFilters);
  }, []);

  const handleAction = (action: string, item: any) => {
    if (action === 'approve') {
      router.post(route("plan-orders.approve", item.id), {}, {
        onError: () => {
          toast.error(t('Failed to approve plan order'));
        }
      });
    } else if (action === 'reject') {
      setRejectingOrder(item);
      setShowRejectModal(true);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };

  const applyFilters = () => {
    const params: any = { page: 1 };
    
    if (searchTerm) {
      params.search = searchTerm;
    }
    
    Object.entries(filterValues).forEach(([key, value]) => {
      if (value && value !== 'all') {
        params[key] = value;
      }
    });
    
    if (pageFilters.per_page) {
      params.per_page = pageFilters.per_page;
    }
    
    const routeName = isMyOrders ? "my-plan-orders.index" : "plan-orders.index";
    router.get(route(routeName), params, { preserveState: true, preserveScroll: true });
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilterValues(prev => ({ ...prev, [key]: value }));
    
    const params: any = { page: 1 };
    
    if (searchTerm) {
      params.search = searchTerm;
    }
    
    const newFilters = { ...filterValues, [key]: value };
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v && v !== 'all') {
        params[k] = v;
      }
    });
    
    if (pageFilters.per_page) {
      params.per_page = pageFilters.per_page;
    }
    
    const routeName = isMyOrders ? "my-plan-orders.index" : "plan-orders.index";
    router.get(route(routeName), params, { preserveState: true, preserveScroll: true });
  };

  const breadcrumbs = [
    { title: t('Dashboard'), href: route('dashboard') },
    { title: t('Plans'), href: route('plans.index') },
    { title: t('Plan Orders') }
  ];

  const hasActiveFilters = () => {
    return Object.entries(filterValues).some(([key, value]) => {
      return value && value !== 'all' && value !== '';
    }) || searchTerm !== '';
  };

  const activeFilterCount = () => {
    return Object.entries(filterValues).filter(([key, value]) => {
      return value && value !== 'all' && value !== '';
    }).length + (searchTerm ? 1 : 0);
  };

  const handleResetFilters = () => {
    // Reset all filters to default values
    const resetFilters: Record<string, any> = {};
    planOrdersConfig.filters?.forEach(filter => {
      resetFilters[filter.key] = 'all';
    });
    
    setFilterValues(resetFilters);
    setSearchTerm('');
    setShowFilters(false);
    
    const routeName = isMyOrders ? "my-plan-orders.index" : "plan-orders.index";
    router.get(route(routeName), { 
      page: 1, 
      per_page: pageFilters.per_page 
    }, { preserveState: true, preserveScroll: true });
  };

  // Render sort icon function like in CrudTable
  const renderSortIcon = (column: any) => {
    if (!column.sortable) return null;

    if (pageFilters.sort_field === column.key) {
      return pageFilters.sort_direction === 'asc' ?
        <ChevronUp className="ml-1 h-4 w-4" /> :
        <ChevronDown className="ml-1 h-4 w-4" />;
    }

    // Always show the double arrow for sortable columns when not sorted
    return <ChevronsUpDown className="ml-1 h-4 w-4 opacity-50" />;
  };

  const handleSort = (field: string) => {
    const direction = pageFilters.sort_field === field && pageFilters.sort_direction === 'asc' ? 'desc' : 'asc';
    
    const params: any = { 
      sort_field: field, 
      sort_direction: direction, 
      page: 1 
    };
    
    // Add search and filters
    if (searchTerm) {
      params.search = searchTerm;
    }
    
    Object.entries(filterValues).forEach(([key, value]) => {
      if (value && value !== 'all') {
        params[key] = value;
      }
    });
    
    // Add per_page if it exists
    if (pageFilters.per_page) {
      params.per_page = pageFilters.per_page;
    }
    
    const routeName = isMyOrders ? "my-plan-orders.index" : "plan-orders.index";
    router.get(route(routeName), params, { preserveState: true, preserveScroll: true });
  };

  // Remove actions for company users viewing their own orders
  const filteredActions = (isMyOrders || userRole !== 'superadmin') 
    ? [] 
    : planOrdersConfig.table.actions?.map(action => ({
        ...action,
        label: t(action.label)
      }));

  return (
    <PageTemplate 
      title={t('Plan Orders')} 
      url="/plan-orders"
      breadcrumbs={breadcrumbs}
      noPadding
    >
      <div className="bg-white rounded-lg shadow mb-4">
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('Search plan orders...')}
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
              
              {planOrdersConfig.filters && planOrdersConfig.filters.length > 0 && (
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
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">{t('Per Page')}:</Label>
              <Select 
                value={pageFilters.per_page?.toString() || "10"} 
                onValueChange={(value) => {
                  const params: any = { page: 1, per_page: parseInt(value) };
                  
                  if (searchTerm) {
                    params.search = searchTerm;
                  }
                  
                  Object.entries(filterValues).forEach(([key, val]) => {
                    if (val && val !== '') {
                      params[key] = val;
                    }
                  });
                  
                  router.get(route(isMyOrders ? "my-plan-orders.index" : "plan-orders.index"), params, { preserveState: true, preserveScroll: true });
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
          
          {showFilters && planOrdersConfig.filters && planOrdersConfig.filters.length > 0 && (
            <div className="w-full mt-3 p-4 bg-gray-50 border rounded-md">
              <div className="flex flex-wrap gap-4 items-end">
                {planOrdersConfig.filters.map((filter) => (
                  <div key={filter.key} className="space-y-2">
                    <Label>{t(filter.label)}</Label>
                    <Select 
                      value={filterValues[filter.key] || ''} 
                      onValueChange={(value) => handleFilterChange(filter.key, value)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder={t('All') + ' ' + t(filter.label)} />
                      </SelectTrigger>
                      <SelectContent>
                        {filter.options?.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {t(option.label)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                
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

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <CrudTable
          columns={planOrdersConfig.table.columns.map(col => ({
            ...col,
            label: t(col.label)
          }))}
          actions={filteredActions}
          data={planOrders?.data || []}
          from={planOrders?.from || 1}
          onAction={handleAction}
          sortField={pageFilters.sort_field}
          sortDirection={pageFilters.sort_direction}
          onSort={handleSort}
          permissions={permissions}
          entityPermissions={planOrdersConfig.entity.permissions}
        />

        <div className="p-4 border-t flex items-center justify-between ">
          <div className="text-sm text-muted-foreground">
            {t('Showing')} <span className="font-medium">{planOrders?.from || 0}</span> {t('to')} <span className="font-medium">{planOrders?.to || 0}</span> {t('of')} <span className="font-medium">{planOrders?.total || 0}</span> {t('plan orders')}
          </div>
          
          <div className="flex gap-1">
            {planOrders?.links?.map((link: any, i: number) => {
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
      </div>

      {/* Reject Order Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('Reject Plan Order')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejection-reason">{t('Rejection reason (optional):')}</Label>
              <Textarea
                id="rejection-reason"
                placeholder={t('Enter rejection reason...')}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowRejectModal(false);
              setRejectingOrder(null);
              setRejectionReason('');
            }}>
              {t('Cancel')}
            </Button>
            <Button variant="destructive" onClick={() => {
              if (rejectingOrder) {
                router.post(route("plan-orders.reject", rejectingOrder.id), { notes: rejectionReason }, {
                  onSuccess: () => {
                    setShowRejectModal(false);
                    setRejectingOrder(null);
                    setRejectionReason('');
                  },
                  onError: () => {
                    toast.error(t('Failed to reject plan order'));
                  }
                });
              }
            }}>
              {t('Reject Order')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTemplate>
  );
}