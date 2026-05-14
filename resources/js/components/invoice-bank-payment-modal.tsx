import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { router } from '@inertiajs/react';
import { toast } from '@/components/custom-toast';

interface InvoiceBankPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: any;
  amount: number;
}

export function InvoiceBankPaymentModal({ isOpen, onClose, invoice, amount }: InvoiceBankPaymentModalProps) {
  const [processing, setProcessing] = useState(false);

  const formatAmount = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (typeof window !== 'undefined' && window.appSettings?.formatCurrency) {
      return window.appSettings.formatCurrency(numAmount);
    }
    return `$${numAmount.toFixed(2)}`;
  };

  const handleSubmit = () => {
    setProcessing(true);

    router.post(route('bank.invoice.payment.link', invoice.payment_token), {
      payment_method: 'bank',
      invoice_token: invoice.payment_token,
      amount: amount
    }, {
      onSuccess: () => {
        toast.success('Payment request submitted successfully');
        onClose();
      },
      onError: (errors) => {
        toast.error(Object.values(errors).join(', '));
        setProcessing(false);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bank Transfer Payment</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Payment Instructions</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p><strong>Amount:</strong> {formatAmount(amount)}</p>
              <p><strong>Invoice:</strong> #{invoice.invoice_number}</p>
              <p><strong>Reference:</strong> {invoice.payment_token}</p>
            </div>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-sm text-yellow-800">
              Your payment request will be submitted for manual verification. Please contact support for bank transfer details.
            </p>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={processing} className="flex-1">
              {processing ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}