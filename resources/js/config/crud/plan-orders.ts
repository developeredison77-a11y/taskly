import { CrudConfig } from '@/types/crud';
import { columnRenderers } from '@/utils/columnRenderers';
import { t } from '@/utils/i18n';

export const planOrdersConfig: CrudConfig = {
  entity: {
    name: 'plan-orders',
    endpoint: route('plan-orders.index'),
    permissions: {
      view: 'view-plan-orders',
      create: 'create-plan-orders',
      edit: 'edit-plan-orders',
      delete: 'delete-plan-orders'
    }
  },
  modalSize: '4xl',
  description: t('Manage plan orders and subscription requests'),
  table: {
    columns: [
      { key: 'order_number', label: t('Order Number'), sortable: true },
      { 
        key: 'ordered_at', 
        label: t('Order Date'), 
        sortable: true, 
        render: columnRenderers.date() 
      },
      { 
        key: 'user.name', 
        label: t('User'), 
        sortable: true 
      },
      { 
        key: 'plan.name', 
        label: t('Plan'), 
        sortable: true,
        render: columnRenderers.status({}, 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-transparent')
      },
      { 
        key: 'original_price', 
        label: t('Original Price'), 
        render: (value) => {
          if (typeof window !== "undefined" && window.appSettings?.formatCurrency) {
            return window.appSettings.formatCurrency(parseFloat(value));
          }
          return `${parseFloat(value).toFixed(2)}`;
        }
      },
      { 
        key: 'coupon_code', 
        label: t('Coupon Code'), 
        render: (value) => value || '-'
      },
      { 
        key: 'discount_amount', 
        label: t('Discount'), 
        render: (value) => {
          if (value > 0) {
            if (typeof window !== "undefined" && window.appSettings?.formatCurrency) {
              return `-${window.appSettings.formatCurrency(parseFloat(value))}`;
            }
            return `-${parseFloat(value).toFixed(2)}`;
          }
          return '-';
        }
      },
      { 
        key: 'final_price', 
        label: t('Final Price'), 
        render: (value) => {
          if (typeof window !== "undefined" && window.appSettings?.formatCurrency) {
            return window.appSettings.formatCurrency(parseFloat(value));
          }
          return `${parseFloat(value).toFixed(2)}`;
        }
      },
      { 
        key: 'status', 
        label: t('Status'), 
        render: columnRenderers.status({
          pending: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
          approved: 'bg-green-100 text-green-800 border border-green-300',
          rejected: 'bg-red-100 text-red-800 border border-red-300'
        })
      }
    ],
    actions: [
      { 
        label: t('Approve'), 
        icon: 'Check', 
        action: 'approve', 
        className: 'text-green-600',
        condition: (row: any) => row.status === 'pending'
      },
      { 
        label: t('Reject'), 
        icon: 'X', 
        action: 'reject', 
        className: 'text-red-600',
        condition: (row: any) => row.status === 'pending'
      }
    ]
  },
  search: {
    enabled: true,
    placeholder: t('Search orders...'),
    fields: ['order_number', 'user.name', 'plan.name', 'coupon_code']
  },
  filters: [
    {
      key: 'status',
      label: t('Status'),
      type: 'select',
      options: [
        { value: 'all', label: t('All Status') },
        { value: 'pending', label: t('Pending') },
        { value: 'approved', label: t('Approved') },
        { value: 'rejected', label: t('Rejected') }
      ]
    }
  ],
  form: {
    fields: []
  }
};