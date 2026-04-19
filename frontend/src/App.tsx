import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { ThemeProvider } from 'styled-components';
import { apolloClient } from './apollo/client';
import { theme } from './styles/theme';
import { GlobalStyles } from './styles/GlobalStyles';
import { LoanListPage } from './pages/LoanList';
import { LoanDetailPage } from './pages/LoanDetail';

export function App() {
  return (
    <ApolloProvider client={apolloClient}>
      <ThemeProvider theme={theme}>
        <GlobalStyles />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Navigate to="/loans" replace />} />
            <Route path="/loans" element={<LoanListPage />} />
            <Route path="/loan/:id" element={<LoanDetailPage />} />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </ApolloProvider>
  );
}
