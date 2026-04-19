import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import styled, { css } from 'styled-components';
import type { ColorMode } from '../styles/theme';

interface NavItem {
  to: string;
  label: string;
  end: boolean;
}

interface HeaderProps {
  colorMode: ColorMode;
  onToggleColorMode: () => void;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Home', end: true },
  { to: '/loans', label: 'Loans', end: false },
  { to: '/loan-simulation', label: 'Loan Simulation', end: false },
  { to: '/statistics', label: 'Statistics', end: false },
];

export function Header({ colorMode, onToggleColorMode }: HeaderProps) {
  const location = useLocation();
  const [isMobileNavOpen, setMobileNavOpen] = useState(false);
  const isDark = colorMode === 'dark';

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isMobileNavOpen) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [isMobileNavOpen]);

  return (
    <>
      <Bar>
        <Inner>
          <BrandLink to="/" aria-label="Bullet Loan Manager — Home">
            <LogoImg src="/logo.png" alt="" />
          </BrandLink>

          <DesktopNav aria-label="Primary">
            {NAV_ITEMS.map((item) => (
              <NavItemLink key={item.to} to={item.to} end={item.end}>
                {item.label}
              </NavItemLink>
            ))}
          </DesktopNav>

          <Actions>
            <UtilityNavLink to="/help">Help</UtilityNavLink>
            <ThemeToggle
              type="button"
              role="switch"
              aria-checked={isDark}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              onClick={onToggleColorMode}
            >
              <ThemeToggleTrack $isDark={isDark}>
                <ThemeToggleIcon $align="left" $emphasize={isDark} aria-hidden>
                  <MoonIcon />
                </ThemeToggleIcon>
                <ThemeToggleIcon $align="right" $emphasize={!isDark} aria-hidden>
                  <SunIcon />
                </ThemeToggleIcon>
                <ThemeToggleThumb $isDark={isDark} />
              </ThemeToggleTrack>
            </ThemeToggle>
            <MobileMenuButton
              type="button"
              aria-label={isMobileNavOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={isMobileNavOpen}
              aria-controls="mobile-nav"
              onClick={() => setMobileNavOpen((open) => !open)}
            >
              {isMobileNavOpen ? <CloseIcon /> : <MenuIcon />}
            </MobileMenuButton>
          </Actions>
        </Inner>

        <MobileDrawer id="mobile-nav" $open={isMobileNavOpen} aria-hidden={!isMobileNavOpen}>
          <MobileNav aria-label="Primary mobile">
            {NAV_ITEMS.map((item) => (
              <MobileNavItem key={item.to} to={item.to} end={item.end}>
                {item.label}
              </MobileNavItem>
            ))}
            <MobileNavItem to="/help" end={false}>Help</MobileNavItem>
          </MobileNav>
        </MobileDrawer>
      </Bar>
    </>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 14.5A8.5 8.5 0 0110.5 4 8.5 8.5 0 0012 21a8.5 8.5 0 009-6.5z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const Bar = styled.header`
  position: sticky;
  top: 0;
  z-index: 20;
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  backdrop-filter: saturate(180%) blur(6px);
`;

const Inner = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  height: 64px;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.lg};
  padding: 0 ${({ theme }) => theme.spacing.xl};

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    height: 56px;
    padding: 0 ${({ theme }) => theme.spacing.md};
    gap: ${({ theme }) => theme.spacing.sm};
  }
`;

const BrandLink = styled(NavLink)`
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  border-radius: ${({ theme }) => theme.radius.sm};

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 3px;
  }
`;

const LogoImg = styled.img`
  display: block;
  height: 42px;
  width: auto;
  object-fit: contain;

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    height: 32px;
  }
`;

const DesktopNav = styled.nav`
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: ${({ theme }) => theme.spacing.md};

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    display: none;
  }
`;

const navItemStyles = css`
  display: inline-flex;
  align-items: center;
  padding: 8px 14px;
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.textSecondary};
  text-decoration: none;
  transition: background 0.12s ease, color 0.12s ease;
  line-height: 1;

  &:hover {
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.textPrimary};
  }

  &[aria-current='page'] {
    background: ${({ theme }) => theme.colors.primaryLight};
    color: ${({ theme }) => theme.colors.primary};
    font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  }
`;

const NavItemLink = styled(NavLink)`
  ${navItemStyles}
`;

const Actions = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.md};

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    gap: ${({ theme }) => theme.spacing.sm};
  }
`;

const ThemeToggle = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  flex-shrink: 0;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 3px;
    border-radius: ${({ theme }) => theme.radius.full};
  }
`;

const ThemeToggleTrack = styled.span<{ $isDark: boolean }>`
  position: relative;
  display: block;
  width: 48px;
  height: 26px;
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.06);
  transition: border-color 0.15s ease, background 0.15s ease;
`;

const ThemeToggleThumb = styled.span<{ $isDark: boolean }>`
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadow.sm};
  transform: translateX(${({ $isDark }) => ($isDark ? 0 : 22)}px);
  transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1;
  pointer-events: none;
`;

const ThemeToggleIcon = styled.span<{ $align: 'left' | 'right'; $emphasize: boolean }>`
  position: absolute;
  top: 50%;
  ${({ $align }) => ($align === 'left' ? 'left: 8px' : 'right: 8px')};
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.textMuted};
  opacity: ${({ $emphasize }) => ($emphasize ? 0.92 : 0.38)};
  transition: opacity 0.15s ease;
  z-index: 0;
  pointer-events: none;
`;

const utilityTextButtonStyles = css`
  padding: 8px 10px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: transparent;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.textSecondary};
  transition: background 0.12s ease, color 0.12s ease;
  border: none;
  cursor: pointer;
  font-family: inherit;
  line-height: inherit;

  &:hover {
    background: ${({ theme }) => theme.colors.background};
    color: ${({ theme }) => theme.colors.textPrimary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const UtilityNavLink = styled(NavLink)`
  ${utilityTextButtonStyles}
  text-decoration: none;

  &[aria-current='page'] {
    background: ${({ theme }) => theme.colors.primaryLight};
    color: ${({ theme }) => theme.colors.primary};
    font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  }
`;

const MobileMenuButton = styled.button`
  display: none;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textPrimary};
  cursor: pointer;
  transition: background 0.12s ease, border-color 0.12s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.background};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    display: inline-flex;
  }
`;

const MobileDrawer = styled.div<{ $open: boolean }>`
  display: none;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.md}
    ${({ theme }) => theme.spacing.md};

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    display: ${({ $open }) => ($open ? 'block' : 'none')};
  }
`;

const MobileNav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const MobileNavItem = styled(NavLink)`
  ${navItemStyles}
  padding: 12px 14px;
  font-size: ${({ theme }) => theme.typography.fontSize.base};
`;
