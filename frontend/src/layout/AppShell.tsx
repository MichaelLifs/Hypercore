import React from 'react';
import { Outlet } from 'react-router-dom';
import styled from 'styled-components';
import type { ColorMode } from '../styles/theme';
import { Header } from './Header';
import { Footer } from './Footer';

interface AppShellProps {
  colorMode: ColorMode;
  onToggleColorMode: () => void;
}

export function AppShell({ colorMode, onToggleColorMode }: AppShellProps) {
  return (
    <Shell>
      <Header colorMode={colorMode} onToggleColorMode={onToggleColorMode} />
      <Main>
        <Outlet />
      </Main>
      <Footer />
    </Shell>
  );
}

const Shell = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.background};
`;

const Main = styled.main`
  flex: 1;
  min-width: 0;
`;
