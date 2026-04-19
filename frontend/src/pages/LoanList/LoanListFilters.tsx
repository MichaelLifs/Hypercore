import React, { useState } from 'react';
import styled from 'styled-components';
import { Button } from '../../components/Button';

export type LoanListFilterValues = {
  search: string;
  startDateFrom: string;
  startDateTo: string;
  principalMin: string;
  principalMax: string;
  interestMin: string;
  interestMax: string;
};

export const defaultLoanListFilterValues = (): LoanListFilterValues => ({
  search: '',
  startDateFrom: '',
  startDateTo: '',
  principalMin: '',
  principalMax: '',
  interestMin: '',
  interestMax: '',
});

interface LoanListFiltersProps {
  values: LoanListFilterValues;
  onChange: (next: LoanListFilterValues) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

export function LoanListFilters({ values, onChange, onClear, hasActiveFilters }: LoanListFiltersProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const patch = (partial: Partial<LoanListFilterValues>) => onChange({ ...values, ...partial });

  const advancedActive =
    !!(values.startDateFrom || values.startDateTo || values.principalMin || values.principalMax || values.interestMin || values.interestMax);

  return (
    <Wrap>
      {/* Search row */}
      <SearchRow>
        <SearchIcon aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5" />
            <line x1="10.5" y1="10.5" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </SearchIcon>
        <SearchInput
          type="search"
          placeholder="Search loans by name…"
          value={values.search}
          onChange={(e) => patch({ search: e.target.value })}
          autoComplete="off"
        />
        <Actions>
          <FilterToggle
            type="button"
            $active={advancedOpen || advancedActive}
            onClick={() => setAdvancedOpen((o) => !o)}
            title="Advanced filters"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <line x1="2" y1="4" x2="14" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="4" y1="8" x2="12" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="6" y1="12" x2="10" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Filters
            {advancedActive && <ActiveDot />}
          </FilterToggle>
          {hasActiveFilters && (
            <Button type="button" $variant="ghost" $size="sm" onClick={onClear}>
              Clear
            </Button>
          )}
        </Actions>
      </SearchRow>

      {/* Advanced filters panel */}
      {advancedOpen && (
        <AdvancedPanel>
          <AdvancedGrid>
            <FieldGroup>
              <GroupLabel>Start date</GroupLabel>
              <RangeRow>
                <RangeInput
                  type="date"
                  aria-label="Start date from"
                  title="From"
                  value={values.startDateFrom}
                  onChange={(e) => patch({ startDateFrom: e.target.value })}
                />
                <RangeSep>–</RangeSep>
                <RangeInput
                  type="date"
                  aria-label="Start date to"
                  title="To"
                  value={values.startDateTo}
                  onChange={(e) => patch({ startDateTo: e.target.value })}
                />
              </RangeRow>
            </FieldGroup>

            <FieldGroup>
              <GroupLabel>Principal ($)</GroupLabel>
              <RangeRow>
                <RangeInput
                  inputMode="decimal"
                  placeholder="Min"
                  aria-label="Principal min"
                  value={values.principalMin}
                  onChange={(e) => patch({ principalMin: e.target.value })}
                />
                <RangeSep>–</RangeSep>
                <RangeInput
                  inputMode="decimal"
                  placeholder="Max"
                  aria-label="Principal max"
                  value={values.principalMax}
                  onChange={(e) => patch({ principalMax: e.target.value })}
                />
              </RangeRow>
            </FieldGroup>

            <FieldGroup>
              <GroupLabel>Total interest ($)</GroupLabel>
              <RangeRow>
                <RangeInput
                  inputMode="decimal"
                  placeholder="Min"
                  aria-label="Interest min"
                  value={values.interestMin}
                  onChange={(e) => patch({ interestMin: e.target.value })}
                />
                <RangeSep>–</RangeSep>
                <RangeInput
                  inputMode="decimal"
                  placeholder="Max"
                  aria-label="Interest max"
                  value={values.interestMax}
                  onChange={(e) => patch({ interestMax: e.target.value })}
                />
              </RangeRow>
            </FieldGroup>
          </AdvancedGrid>
        </AdvancedPanel>
      )}
    </Wrap>
  );
}

/* ─── styled ─── */

const Wrap = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const SearchRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 0 ${({ theme }) => theme.spacing.md};
  box-shadow: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &:focus-within {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primaryLight};
  }
`;

const SearchIcon = styled.span`
  display: flex;
  align-items: center;
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const SearchInput = styled.input`
  flex: 1;
  min-width: 0;
  height: 46px;
  border: none;
  background: transparent;
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-family: inherit;
  color: ${({ theme }) => theme.colors.textPrimary};

  &::placeholder {
    color: ${({ theme }) => theme.colors.textMuted};
  }

  &:focus {
    outline: none;
  }

  &::-webkit-search-cancel-button { display: none; }
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xs};
  flex-shrink: 0;
`;

const FilterToggle = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  position: relative;
  height: 34px;
  padding: 0 14px;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-family: inherit;
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.textSecondary)};
  background: ${({ theme, $active }) => ($active ? theme.colors.primaryLight : 'transparent')};
  border: 1.5px solid ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radius.md};
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;

  &:hover {
    background: ${({ theme }) => theme.colors.primaryLight};
    color: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primaryLight};
    border-color: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const ActiveDot = styled.span`
  position: absolute;
  top: 5px;
  right: 5px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary};
`;

const AdvancedPanel = styled.div`
  margin-top: ${({ theme }) => theme.spacing.sm};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: ${({ theme }) => theme.spacing.md} ${({ theme }) => theme.spacing.lg};
  box-shadow: ${({ theme }) => theme.shadow.sm};
`;

const AdvancedGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing.lg};

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: 1fr;
  }
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => `calc(${theme.spacing.sm} + 2px)`};
`;

const GroupLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const RangeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const RangeSep = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.textMuted};
  flex-shrink: 0;
`;

const RangeInput = styled.input`
  flex: 1;
  min-width: 0;
  padding: 8px 10px;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-family: inherit;
  color: ${({ theme }) => theme.colors.textPrimary};
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};

  &::placeholder {
    color: ${({ theme }) => theme.colors.textMuted};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.primaryLight};
  }
`;
