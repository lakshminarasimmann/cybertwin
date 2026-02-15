'use client';
import './globals.css';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function RootLayout({ children }) {
    const pathname = usePathname();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { href: '/', label: 'Home', icon: '⌂' },
        { href: '/dashboard', label: 'Dashboard', icon: '◎' },
        { href: '/dataset', label: 'Dataset', icon: '◈' },
        { href: '/analytics', label: 'Analytics', icon: '◉' },
        { href: '/architecture', label: 'Architecture', icon: '⬡' },
        { href: '/about', label: 'About', icon: 'ⓘ' },
    ];

    return (
        <html lang="en">
            <head>
                <title>CYBERTWIN — Cognitive Attack Narrative Reconstruction</title>
                <meta name="description" content="Privacy-preserving identity verification through behavioral biometrics and cognitive digital twin technology. Real-time threat detection using ML-powered keystroke dynamics analysis." />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🛡️</text></svg>" />
            </head>
            <body>
                <nav className="nav" style={{
                    background: scrolled ? 'rgba(10, 14, 23, 0.95)' : 'rgba(10, 14, 23, 0.85)',
                    boxShadow: scrolled ? '0 4px 20px rgba(0,0,0,0.3)' : 'none',
                }}>
                    <Link href="/" className="nav-logo" style={{ textDecoration: 'none' }}>
                        CYBERTWIN
                        <span>Behavioral Intelligence</span>
                    </Link>

                    <ul className="nav-links">
                        {navLinks.map(link => (
                            <li key={link.href}>
                                <Link
                                    href={link.href}
                                    className={pathname === link.href ? 'active' : ''}
                                >
                                    {link.icon} {link.label}
                                </Link>
                            </li>
                        ))}
                    </ul>

                    <div className="nav-status">SYSTEM ONLINE</div>
                </nav>

                <main className="page">{children}</main>

                <footer className="footer">
                    <p>
                        <strong style={{ color: 'var(--cyan)' }}>CYBERTWIN</strong> — Continuous Identity Verification & Cognitive Attack Narrative Reconstruction
                    </p>
                    <p style={{ marginTop: '0.5rem' }}>
                        Powered by CMU Keystroke Dynamics Benchmark • SQLite • Next.js • Advanced ML Pipeline
                    </p>
                </footer>
            </body>
        </html>
    );
}
