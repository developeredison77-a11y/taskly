import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/custom-toast';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, AlertCircle, Loader2 } from 'lucide-react';

declare global {
  interface Window {
    Brick: any;
  }
}

interface InvoicePaymentWallFormProps {
  invoice: {
    id: number;
    payment_token: string;
  };
  paymentwallPublicKey: string;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export function InvoicePaymentWallForm({
  invoice,
  paymentwallPublicKey,
  amount,
  onSuccess,
  onCancel
}: InvoicePaymentWallFormProps) {
  const { t } = useTranslation();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brickLoaded, setBrickLoaded] = useState(false);
  const [brickInstance, setBrickInstance] = useState<any>(null);

  useEffect(() => {
    loadBrickScript();
    return () => {
      // Cleanup
      const container = document.getElementById('brick-container');
      if (container) {
        container.innerHTML = '';
      }
    };
  }, []);

  const loadBrickScript = () => {
    if (window.Brick) {
      setBrickLoaded(true);
      initializeBrick();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://api.paymentwall.com/brick/build/brick-default.1.5.0.min.js';
    script.onload = () => {
      setBrickLoaded(true);
      initializeBrick();
    };
    script.onerror = () => setError(t('Failed to load PaymentWall'));
    document.head.appendChild(script);
  };

  const initializeBrick = async () => {
    try {
      // Get Brick configuration
      const configResponse = await fetch(route('paymentwall.create-invoice-payment'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify({
          invoice_token: invoice.payment_token,
          amount: amount,
        }),
      });

      const configData = await configResponse.json();

      if (!configData.success) {
        throw new Error(configData.error || t('Payment configuration failed'));
      }

      // Initialize Brick
      const brick = new window.Brick({
        public_key: configData.brick_config.public_key,
        amount: configData.brick_config.amount,
        currency: configData.brick_config.currency,
        container: 'brick-container',
        form: {
          merchant: 'Taskly',
          product: configData.brick_config.description,
          pay_button: t('Pay Now'),
          show_zip: false,
          show_cardholder: true
        }
      });

      setBrickInstance(brick);

      // Show payment form
      brick.showPaymentForm(function(data: any) {
        if (data.type === 'Error') {
          setError(data.error || t('Payment failed'));
          setProcessing(false);
          return;
        }

        if (data.brick_token && data.brick_fingerprint) {
          processPaymentWithToken(data.brick_token, data.brick_fingerprint);
        }
      });

    } catch (err) {
      console.error('PaymentWall initialization error:', err);
      setError(err instanceof Error ? err.message : t('Payment initialization failed'));
    }
  };

  const processPaymentWithToken = async (token: string, fingerprint: string) => {
    setProcessing(true);
    try {
      const response = await fetch(route('paymentwall.process-invoice-payment'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify({
          invoice_token: invoice.payment_token,
          amount: amount,
          brick_token: token,
          brick_fingerprint: fingerprint,
        }),
      });

      if (response.ok) {
        toast.success(t('Payment successful!'));
        onSuccess();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || t('Payment processing failed'));
      }
    } catch (err) {
      console.error('Payment processing error:', err);
      setError(err instanceof Error ? err.message : t('Payment processing failed'));
    } finally {
      setProcessing(false);
    }
  };

  if (!paymentwallPublicKey) {
    return <div className="p-4 text-center text-red-500">{t('PaymentWall not configured')}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <CreditCard className="h-5 w-5" />
        <h3 className="text-lg font-semibold">{t('PaymentWall Payment')}</h3>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {t('Secure payment processing via PaymentWall. Your card details are encrypted and secure.')}
        </AlertDescription>
      </Alert>

      <div className="bg-muted p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="font-medium">{t('Amount to Pay')}</span>
          <span className="text-lg font-bold">
            ${amount.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Brick container */}
      <div id="brick-container" className="min-h-[300px] border rounded-lg p-4">
        {!brickLoaded && (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            {t('Loading payment form...')}
          </div>
        )}
      </div>

      {processing && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>{t('Processing payment...')}</span>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onCancel} className="flex-1" disabled={processing}>
          {t('Cancel')}
        </Button>
      </div>

      <div className="text-xs text-muted-foreground text-center">
        {t('Powered by PaymentWall - Secure payment processing')}
      </div>
    </div>
  );
}