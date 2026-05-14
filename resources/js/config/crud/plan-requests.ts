import { CrudConfig } from '@/types/crud';
import { columnRenderers } from '@/utils/columnRenderers';
import { t } from '@/utils/i18n';

export const planRequestsConfig: CrudConfig = {
  entity: {
    name: 'planRequests',
    endpoint: route('plan-requests.index'),
    permissions: {
      view: 'view-plan-requests',
      create: 'create-plan-requests',
      edit: 'edit-plan-requests',
      delete: 'delete-plan-requests'
    }
  },
  modalSize: '4xl',
  description: t('Manage plan upgrade requests from users'),
  table: {
    columns: [
      { key: 'user.name', label: t('Name'), sortable: true },
      { key: 'user.email', label: t('Email'), sortable: true },
      { 
        key: 'plan.name', 
        label: t('Plan'), 
        sortable: true,
        render: columnRenderers.status({}, 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-transparent')
      },
      { 
        key: 'duration', 
        label: t('Billing Cycle'), 
        render: (value) => value === 'yearly' ? t('Yearly') : t('Monthly')
      },
      { 
        key: 'subtotal', 
        label: t('Subtotal'), 
        render: (value) => value ? `${parseFloat(value).toFixed(2)}` : '-'
      },
      { 
        key: 'total', 
        label: t('Total'), 
        render: (value) => value ? `${parseFloat(value).toFixed(2)}` : '-'
      },
      { 
        key: 'status', 
        label: t('Status'), 
        render: columnRenderers.status({
          pending: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
          approved: 'bg-green-100 text-green-800 border border-green-300',
          rejected: 'bg-red-100 text-red-800 border border-red-300',
          cancelled: 'bg-gray-100 text-gray-800 border border-gray-300'
        })
      },
      { 
        key: 'created_at', 
        label: t('Requested At'), 
        sortable: true, 
        render: columnRenderers.date() 
      }
    ],
    actions: [
      { 
        label: t('Approve'), 
        icon: 'Check', 
        action: 'approve', 
        className: 'text-green-600',
        condition: (item: any) => item.status === 'pending'
      },
      { 
        label: t('Reject'), 
        icon: 'X', 
        action: 'reject', 
        className: 'text-red-600',
        condition: (item: any) => item.status === 'pending'
      }
    ]
  },
  search: {
    enabled: true,
    placeholder: t('Search plan requests...'),
    fields: ['user.name', 'user.email', 'plan.name']
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
        { value: 'rejected', label: t('Rejected') },
        { value: 'cancelled', label: t('Cancelled') }
      ]
    }
  ],
  form: {
    fields: []
  }
};