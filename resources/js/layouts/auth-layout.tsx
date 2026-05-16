import React from 'react';
import { Head, usePage } from '@inertiajs/react';
import { CreditCard, Users, Smartphone, QrCode } from 'lucide-react';
import { ReactNode, useEffect, useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useBrand } from '@/contexts/BrandContext';
import { useAppearance, THEME_COLORS } from '@/hooks/use-appearance';
import { isDemoMode, getCookie } from '@/utils/cookie-utils';

import CookieConsentBanner from '@/components/cookie-consent-banner';

interface AuthLayoutProps {
    children: ReactNode;
    title: string;
    description?: string;
    icon?: ReactNode;
    status?: string;
    statusType?: 'success' | 'error';
}

export default function AuthLayout({
    children,
    title,
    description,
    icon,
    status,
    statusType = 'success',
}: AuthLayoutProps) {
    const { t, i18n } = useTranslation();
    const [mounted, setMounted] = useState(false);
    const { logoLight, logoDark, themeColor, customColor } = useBrand();
    const { appearance } = useAppearance();
    const [isDarkTheme, setIsDarkTheme] = useState(() => document.documentElement.classList.contains('dark'));

    const { globalSettings } = usePage().props as any;

    // Listen for theme changes using MutationObserver (same as sidebar)
    useEffect(() => {
        const handleThemeChange = () => {
            const newIsDark = document.documentElement.classList.contains('dark');
            setIsDarkTheme(newIsDark);
        };
        
        // Create a MutationObserver to watch for class changes on html element
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    handleThemeChange();
                }
            });
        });
        
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });
        
        return () => {
            observer.disconnect();
        };
    }, []);

    const currentLogo = isDarkTheme ? logoLight : logoDark;
    const primaryColor = themeColor === 'custom' ? customColor : THEME_COLORS[themeColor as keyof typeof THEME_COLORS];

    // RTL Support for auth pages - Apply immediately and persist
    const applyRTLDirection = React.useCallback(() => {
        const isDemo = globalSettings?.is_demo || false;
        const currentLang = i18n.language || globalSettings?.defaultLanguage || 'en';
        const isRTLLanguage = ['ar', 'he'].includes(currentLang);
        let dir = 'ltr';

        // Check RTL setting from cookies/globalSettings
        let data = getCookie('brandSettings');
        if (data) {
            try {
                const parsed = JSON.parse(data);
                data = parsed.layoutDirection;
            } catch (error) {
                data = null;
            }
        }


        // Check RTL setting from cookies/globalSettings
        const layoutDirection = isDemo ? data : globalSettings?.layoutDirection; const isRTLSetting = layoutDirection === 'right';
        
        // Apply RTL if: 1) Language is ar/he OR 2) RTL setting is enabled
        if (isRTLLanguage || isRTLSetting) {
            dir = 'rtl';
        }

        // Apply direction immediately
        document.documentElement.dir = dir;
        document.documentElement.setAttribute('dir', dir);
        document.body.dir = dir;

        return dir;
    }, [i18n.language, globalSettings?.defaultLanguage, globalSettings?.is_demo, globalSettings?.layoutDirection]);

    // Apply RTL on mount and when dependencies change
    React.useLayoutEffect(() => {
        const direction = applyRTLDirection();

        // Ensure direction persists after any DOM changes
        const observer = new MutationObserver(() => {
            if (document.documentElement.dir !== direction) {
                document.documentElement.dir = direction;
                document.documentElement.setAttribute('dir', direction);
            }
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['dir']
        });

        return () => observer.disconnect();
    }, [applyRTLDirection]);

    // Apply theme mode (dark/light) to auth pages
    React.useEffect(() => {
        let themeMode = 'light'; // default

        if (isDemoMode()) {
            // In demo mode, get theme from cookies
            try {
                const themeSettings = getCookie('themeSettings');
                if (themeSettings) {
                    const parsed = JSON.parse(themeSettings);
                    themeMode = parsed.appearance || 'light';
                }
            } catch (error) {
                // Use default
            }
        } else {
            // In live mode, get theme from database
            themeMode = globalSettings?.themeMode || 'light';
        }

        // Apply theme mode
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDark = themeMode === 'dark' || (themeMode === 'system' && prefersDark);

        document.documentElement.classList.toggle('dark', isDark);
        document.body.classList.toggle('dark', isDark);
    }, [globalSettings?.themeMode]);


    // Apply demo mode language and RTL immediately on mount
    useLayoutEffect(() => {
        const isDemo = globalSettings?.is_demo || false;

        if (isDemo) {
            // In demo mode, check for saved language in localStorage
            const savedLanguage = localStorage.getItem('i18nextLng');
            if (savedLanguage && i18n.language !== savedLanguage) {
                i18n.changeLanguage(savedLanguage);
            }
        }

        setMounted(true);
    }, [globalSettings, i18n]);

    // Listen for language changes in demo mode
    useEffect(() => {
        const isDemo = globalSettings?.is_demo || false;

        if (isDemo) {
            const handleStorageChange = (e: StorageEvent) => {
                if (e.key === 'i18nextLng' && e.newValue && i18n.language !== e.newValue) {
                    i18n.changeLanguage(e.newValue);
                }
            };

            window.addEventListener('storage', handleStorageChange);
            return () => window.removeEventListener('storage', handleStorageChange);
        }
    }, [globalSettings?.is_demo, i18n]);

    function hexToAdjustedRgba(hex, opacity = 1, adjust = 0) {
        hex = hex.replace("#", "");
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        const clamp = (v) => Math.max(-1, Math.min(1, v));
        const getF = (ch) =>
            typeof adjust === "number" ? clamp(adjust) : clamp(adjust[ch] ?? 0);
        const adj = (c, f) =>
            f < 0 ? Math.floor(c * (1 + f)) : Math.floor(c + (255 - c) * f);
        const rr = adj(r, getF("r"));
        const gg = adj(g, getF("g"));
        const bb = adj(b, getF("b"));
        return opacity === 1
            ? `#${rr.toString(16).padStart(2, "0")}${gg
                .toString(16)
                .padStart(2, "0")}${bb.toString(16).padStart(2, "0")}`.toUpperCase()
            : `rgba(${rr}, ${gg}, ${bb}, ${opacity})`;
    }

    return (
        <div className="flex min-h-screen w-full bg-slate-50 dark:bg-slate-900">
            <Head title={title} />

            {/* Right side - Content */}
            <div className="w-full flex items-center justify-center p-6 relative bg-gray-50 dark:bg-slate-900">
                {/* Enhanced Background Design */}
                <div className="absolute inset-0">
                    {/* Base Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-gray-50 to-stone-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800"></div>
                    
                    {/* Elegant Pattern Overlay */}
                    <div className="absolute inset-0 opacity-70" style={{
                        backgroundImage: `radial-gradient(circle at 30% 70%, ${primaryColor} 1px, transparent 1px)`,
                        backgroundSize: '80px 80px'
                    }}></div>
                </div>
                
                {/* Language Switcher - Top Right */}
                <div className="absolute top-6 right-6 z-10">
                    <LanguageSwitcher />
                </div>

                <div
                    className={`w-full max-w-md transition-all duration-700 relative ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                        }`}
                >
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <div className="relative lg:inline-block pb-2 lg:px-6">
                            {currentLogo ? (
                                <img 
                                    key={`auth-logo-${isDarkTheme}-${logoLight}-${logoDark}`}
                                    src={currentLogo} 
                                    alt="Logo" 
                                    className="w-auto mx-auto" 
                                />
                            ) : (
                                <CreditCard className="h-8 w-auto mx-auto" style={{ color: primaryColor }} />
                            )}
                        </div>
                    </div>

                    {/* Main Card */}
                    <div className="relative">
                        {/* Corner accents */}
                        <div className="absolute -top-3 -left-3 w-6 h-6 border-l-2 border-t-2 rounded-tl-md" style={{ borderColor: primaryColor }}></div>
                        <div className="absolute -bottom-3 -right-3 w-6 h-6 border-r-2 border-b-2 rounded-br-md" style={{ borderColor: primaryColor }}></div>

                        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg lg:p-8 p-4 lg:pt-5 shadow-sm">
                            {/* Header */}
                            <div className="text-center mb-4">
                                {icon && (
                                    <div
                                        className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
                                        style={{ backgroundColor: `${primaryColor}20` }}
                                    >
                                        {icon}
                                    </div>
                                )}
                                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-1.5 tracking-wide">{title}</h1>
                                <div className="w-12 h-px mx-auto mb-2.5" style={{ backgroundColor: primaryColor }}></div>
                                {description && (
                                    <p className="text-gray-700 dark:text-slate-400 text-sm">{description}</p>
                                )}
                            </div>

                            {status && (
                                <div className={`mb-6 text-center text-sm font-medium ${statusType === 'success'
                                    ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/30'
                                    : 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/30'
                                    } p-3 rounded-lg border`}>
                                    {status}
                                </div>
                            )}

                            {children}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-6">
                            <div className="inline-flex items-center space-x-2 bg-white backdrop-blur-sm rounded-md px-4 py-2 border border-gray-200">
                                <p className="text-sm text-gray-500">{globalSettings?.footerText || '© 2026 Taskly'}</p>
                            </div>
                    </div>
                </div>
            </div>
            <CookieConsentBanner />
        </div>
    );
}