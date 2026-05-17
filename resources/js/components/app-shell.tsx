import { SidebarProvider } from '@/components/ui/sidebar';
import { useLayout } from '@/contexts/LayoutContext';
import { FloatingChatGpt } from '@/components/FloatingChatGpt';
import CookieConsentBanner from '@/components/cookie-consent-banner';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface AppShellProps {
    children: React.ReactNode;
    variant?: 'header' | 'sidebar';
}

export function AppShell({ children, variant = 'header' }: AppShellProps) {
    const [isOpen, setIsOpen] = useState(true);

    const handleSidebarChange = (open: boolean) => {
        // Keep desktop sidebar always open so logo remains visible consistently.
        // Mobile open/close still works via Sidebar's internal openMobile state.
        if (open !== true) {
            setIsOpen(true);
            if (typeof window !== 'undefined') {
                localStorage.setItem('sidebar', 'true');
            }
            return;
        }

        setIsOpen(true);
        if (typeof window !== 'undefined') {
            localStorage.setItem('sidebar', 'true');
        }
    };

    if (variant === 'header') {
        return (
            <div className="flex min-h-screen w-full flex-col">
                {children}
                <FloatingChatGpt />
                <CookieConsentBanner />
            </div>
        );
    }

    const { position } = useLayout();

    return (
        <SidebarProvider defaultOpen={isOpen} open={isOpen} onOpenChange={handleSidebarChange}>
            <div className={cn('flex w-full', position === 'right' ? 'flex-row-reverse' : 'flex-row')}>

                {children}
                <FloatingChatGpt />
                <CookieConsentBanner />
            </div>
        </SidebarProvider>
    );
}
