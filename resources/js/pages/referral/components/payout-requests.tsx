import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CrudTable } from '@/components/CrudTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Plus, Check, X } from 'lucide-react';
import { useForm } from '@inertiajs/react';
import { toast } from '@/components/custom-toast';
import { columnRenderers } from '@/utils/columnRenderers';

interface PayoutRequestsProps {
  userType: string;
  payoutRequests: any;
  settings: any;
  stats: any;
  currencySymbol?: string;
}

export default function PayoutRequests({ userType, payoutRequests, settings, stats, currencySymbol }: PayoutRequestsProps) {
  const { t } = useTranslation();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  const { data, setData, post, processing, errors, reset } = useForm({
    amount: '',
  });

  const { data: rejectData, setData: setRejectData, post: postReject, processing: rejectProcessing } = useForm({
    notes: '',
  });

  const handleCreatePayout = (e: React.FormEvent) => {
    e.preventDefault();
    post(route('referral.payout-request.create'), {
      onSuccess: () => {
        setShowCreateDialog(false);
        reset();
        toast.success(t('Payout request submitted successfully'));
      },
    });
  };

  const handleApprove = (request: any) => {
    toast.loading(t('Approving payout request...'));
    post(route('referral.payout-request.approve', request.id), {
      onSuccess: (page) => {
        toast.dismiss();
        if (page.props.flash.success) {
          toast.success(t(page.props.flash.success));
        } else if (page.props.flash.error) {
          toast.error(t(page.props.flash.error));
        }
      },
      onError: (errors) => {
        toast.dismiss();
        if (typeof errors === 'string') {
          toast.error(errors);
        } else {
          toast.error(`Failed to approve payout request: ${Object.values(errors).join(', ')}`);
        }
      }
    });
  };
  const handleReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRequest) {
      postReject(route('referral.payout-request.reject', selectedRequest.id), {
        onSuccess: (page) => {
          setShowRejectDialog(false);
          setSelectedRequest(null);
          setRejectData('notes', '');
          if (page.props.flash.success) {
            toast.success(t(page.props.flash.success));
          } else if (page.props.flash.error) {
            toast.error(t(page.props.flash.error));
          }
        },
        onError: (errors) => {
          if (typeof errors === 'string') {
            toast.error(errors);
          } else {
            toast.error(`Failed to reject payout request: ${Object.values(errors).join(', ')}`);
          }
        }
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusRenderer = columnRenderers.status({
      pending: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
      approved: 'bg-green-100 text-green-800 border border-green-300',
      rejected: 'bg-red-100 text-red-800 border border-red-300'
    });
    return statusRenderer(status);
  };

  const handleAction = (action: string, request: any) => {
    if (action === 'approve') {
      handleApprove(request);
    } else if (action === 'reject') {
      setSelectedRequest(request);
      setShowRejectDialog(true);
    }
  };

  // Define table columns
  const getColumns = () => {
    const columns = [];
    
    if (userType === 'superadmin') {
      columns.push({
        key: 'company',
        label: t('Company'),
        render: (value: any, row: any) => (
          <div>
            <p className="font-medium">{row.company?.name}</p>
            <p className="text-sm text-muted-foreground">{row.company?.email}</p>
          </div>
        )
      });
    }
    
    columns.push(
      {
        key: 'amount',
        label: t('Amount'),
        render: (value: number) => `${currencySymbol}${value}`
      },
      {
        key: 'status',
        label: t('Status'),
        render: (value: string) => getStatusBadge(value)
      },
      {
        key: 'created_at',
        label: t('Date'),
        render: (value: string) => new Date(value).toLocaleDateString()
      }
    );
    
    return columns;
  };

  // Define table actions
  const getActions = () => {
    if (userType !== 'superadmin') return [];
    
    return [
      {
        label: t('Approve'),
        icon: 'Check',
        action: 'approve',
        className: 'text-green-600 hover:text-green-700',
        condition: (request: any) => request.status === 'pending'
      },
      {
        label: t('Reject'),
        icon: 'X',
        action: 'reject',
        className: 'text-red-600 hover:text-red-700',
        condition: (request: any) => request.status === 'pending'
      }
    ];
  };

  return (
    <div className="space-y-6">
      {userType === 'company' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-semibold">{t('Create Payout Request')}</CardTitle>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button disabled={stats.availableBalance < settings.threshold_amount}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('Request Payout')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('Create Payout Request')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreatePayout} className="space-y-4">
                  <div>
                    <Label htmlFor="amount">{t('Amount')}</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min={settings.threshold_amount}
                      max={stats.availableBalance}
                      value={data.amount}
                      onChange={(e) => setData('amount', e.target.value)}
                      placeholder={`Min: ${currencySymbol}${settings.threshold_amount}`}
                    />
                    {errors.amount && <p className="text-sm text-red-500">{errors.amount}</p>}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>{t('Available Balance')}: {currencySymbol}{stats.availableBalance}</p>
                    <p>{t('Minimum Amount')}: {currencySymbol}{settings.threshold_amount}</p>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                      {t('Cancel')}
                    </Button>
                    <Button type="submit" disabled={processing}>
                      {t('Submit Request')}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {stats.availableBalance < settings.threshold_amount
                ? t('You need at least {{amount}} to request a payout', { amount: `${currencySymbol}${settings.threshold_amount}` })
                : t('You can request up to {{amount}} for payout', { amount: `${currencySymbol}${stats.availableBalance}` })}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold leading-none tracking-tight">
            {userType === 'superadmin' ? t('All Payout Requests') : t('Your Payout Requests')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CrudTable
            columns={getColumns()}
            actions={getActions()}
            data={payoutRequests.data || []}
            from={1}
            onAction={handleAction}
            permissions={[]}
            showActions={userType === 'superadmin'}
          />
        </CardContent>
      </Card>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Reject Payout Request')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleReject} className="space-y-4">
            <div>
              <Label htmlFor="notes">{t('Rejection Reason')}</Label>
              <Textarea
                id="notes"
                value={rejectData.notes}
                onChange={(e) => setRejectData('notes', e.target.value)}
                placeholder={t('Enter reason for rejection...')}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowRejectDialog(false)}>
                {t('Cancel')}
              </Button>
              <Button type="submit" variant="destructive" disabled={rejectProcessing}>
                {t('Reject Request')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}