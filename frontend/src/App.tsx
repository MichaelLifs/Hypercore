import React, { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { ThemeProvider } from 'styled-components';
import { apolloClient } from './apollo/client';
import { createAppTheme, type ColorMode } from './styles/theme';
import { GlobalStyles } from './styles/GlobalStyles';
import { AppShell } from './layout/AppShell';
import { HomePage } from './pages/Home';
import { LoanListPage } from './pages/LoanList';
import { LoanDetailPage } from './pages/LoanDetail';
import { HelpPage } from './pages/Help';
import { LoanSimulationPage } from './pages/LoanSimulation';

const THEME_STORAGE_KEY = 'blm-color-mode';

function readStoredMode(): ColorMode {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === 'dark' || raw === 'light') return raw;
  } catch {
    // ignore
  }
  return 'light';
}

export function App() {
  const [colorMode, setColorMode] = useState<ColorMode>(readStoredMode);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, colorMode);
    } catch {
      // ignore
    }
  }, [colorMode]);

  const theme = useMemo(() => createAppTheme(colorMode), [colorMode]);

  const toggleColorMode = () => {
    setColorMode((m) => (m === 'light' ? 'dark' : 'light'));
  };

  return (
    <ApolloProvider client={apolloClient}>
      <ThemeProvider theme={theme}>
        <GlobalStyles />
        <BrowserRouter>
          <Routes>
            <Route
              element={<AppShell colorMode={colorMode} onToggleColorMode={toggleColorMode} />}
            >
              <Route path="/" element={<HomePage />} />
              <Route path="/loans" element={<LoanListPage />} />
              <Route path="/loan/:id" element={<LoanDetailPage />} />
              <Route path="/help" element={<HelpPage />} />
              <Route path="/loan-simulation" element={<LoanSimulationPage />} />
              <Route path="/interest-calculator" element={<Navigate to="/loan-simulation" replace />} />
              <Route path="/estimator" element={<Navigate to="/loan-simulation" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </ApolloProvider>
  );
}
