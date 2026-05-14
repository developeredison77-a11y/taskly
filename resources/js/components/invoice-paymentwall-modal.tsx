import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard, AlertCircle } from 'lucide-react';
import { toast } from '@/components/custom-toast';

declare global {
    interface Window {
        Brick: any;
    }
}

interface PaymentWallPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: any;
    amount: number;
}

export function PaymentWallPaymentModal({ isOpen, onClose, invoice, amount }: PaymentWallPaymentModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [brickLoaded, setBrickLoaded] = useState(false);
    const [brickInstance, setBrickInstance] = useState<any>(null);
    const paymentFormRef = useRef<HTMLDivElement>(null);

    const formatAmount = (amount: number | string) => {
        if (typeof window !== 'undefined' && window.appSettings?.formatCurrency) {
            return window.appSettings.formatCurrency(amount);
        }
        return `$${(typeof amount === 'string' ? parseFloat(amount) : amount).toFixed(2)}`;
    };

    // Load Brick.js script
    useEffect(() => {
        if (!isOpen) return;

        const loadBrickScript = () => {
            if (window.Brick) {
                setBrickLoaded(true);
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://api.paymentwall.com/brick/build/brick-default.1.5.0.min.js';
            script.async = true;
            script.onload = () => {
                setBrickLoaded(true);
            };
            script.onerror = () => {
                setError('Failed to load PaymentWall payment form');
            };
            document.head.appendChild(script);
        };

        loadBrickScript();
    }, [isOpen]);

    // Initialize Brick payment form
    useEffect(() => {
        if (brickLoaded && isOpen && !brickInstance) {
            initializeBrickForm();
        }
    }, [brickLoaded, isOpen, brickInstance]);

    const initializeBrickForm = async () => {
        try {
            const response = await fetch(route('paymentwall.invoice.payment.link', invoice.payment_token), {
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

            const data = await response.json();

            if (data.success && data.brick_config) {
                const config = data.brick_config;

                const brick = new window.Brick({
                    public_key: config.public_key,
                    amount: config.amount,
                    currency: config.currency,
                    container: 'paymentwall-invoice-form-container',
                    action: route('paymentwall.process.invoice'),
                    form: {
                        merchant: 'Invoice Payment',
                        product: config.description,
                        pay_button: 'Pay Now',
                        show_zip: true,
                        show_cardholder: true
                    }
                });

                brick.showPaymentForm(
                    (data: any) => {
                        // Success callback
                        onClose();
                        toast.success('Payment successful');
                        window.location.reload();
                    },
                    (errors: any) => {
                        // Error callback
                        console.error('Payment error:', errors);
                        if (errors && errors.length > 0) {
                            setError(errors[0].message || 'Payment failed');
                        } else {
                            setError('Payment failed');
                        }
                        setIsLoading(false);
                    }
                );

                setBrickInstance(brick);
            } else {
                throw new Error(data.error || 'Failed to initialize payment form');
            }
        } catch (err) {
            console.error('PaymentWall initialization error:', err);
            setError(err instanceof Error ? err.message : 'Payment initialization failed');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        PaymentWall Payment
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="text-sm text-blue-600 font-medium">
                            Invoice #{invoice.invoice_number}
                        </div>
                        <div className="text-2xl font-bold text-blue-900">
                            {formatAmount(amount)}
                        </div>
                    </div>

                    {/* PaymentWall Brick.js Form Container */}
                    <div className="space-y-4">
                        <div id="paymentwall-invoice-form-container" ref={paymentFormRef} className="min-h-[300px]">
                            {!brickLoaded && (
                                <div className="flex items-center justify-center h-32">
                                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                                    <span>Loading payment form...</span>
                                </div>
                            )}
                        </div>

                        {/* Hidden form fields for Brick.js */}
                        <form id="brick-invoice-form" style={{ display: 'none' }}>
                            <input type="hidden" name="invoice_token" value={invoice.payment_token} />
                            <input type="hidden" name="amount" value={amount} />
                            <input type="hidden" name="_token" value={document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''} />
                        </form>
                    </div>

                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}