import React, { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import toast from 'react-hot-toast';
import styled from 'styled-components';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { CREATE_LOAN } from '../../graphql/operations/loans';
import { validateLoanForm, hasFormErrors } from '../../utils/loanFormValidation';
import type { LoanFormErrors } from '../../utils/loanFormValidation';
import { userFacingErrorMessage } from '../../utils/graphqlError';

interface RateSegmentSnapshot {
  effectiveFrom: string;
  effectiveTo: string | null;
  annualRate: number;
}

interface InitialValues {
  principal?: string;
  startDate?: string;
  endDate?: string;
  /** Rate snapshot from simulateLoan, pinned so createLoan reproduces the preview. */
  rateSegments?: RateSegmentSnapshot[];
}

interface NewLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  initialValues?: InitialValues;
}

interface FormState {
  name: string;
  principal: string;
  startDate: string;
  endDate: string;
  nonWorkDayPolicy:string;
}

const EMPTY_FORM: FormState = {
  name: '',
  principal: '',
  startDate: '',
  endDate: '',
  nonWorkDayPolicy:'ALLOWED'
};

export function NewLoanModal({ isOpen, onClose, onCreated, initialValues }: NewLoanModalProps) {
  const [form, setForm] = useState<FormState>(() => ({
    ...EMPTY_FORM,
    ...initialValues,
  }));
  const [fieldErrors, setFieldErrors] = useState<LoanFormErrors>({});

  useEffect(() => {
    if (isOpen) {
      setForm({ ...EMPTY_FORM, ...initialValues });
      setFieldErrors({});
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const [createLoan, { loading, error }] = useMutation(CREATE_LOAN);

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (field !=='nonWorkDayPolicy' && fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateLoanForm(form);
    if (hasFormErrors(validation)) {
      setFieldErrors(validation);
      return;
    }
    setFieldErrors({});
    try {
      const seededSegments = initialValues?.rateSegments;
      const matchesSeed =
        seededSegments !== undefined &&
        form.startDate === initialValues?.startDate &&
        form.endDate === initialValues?.endDate &&
        Number(String(form.principal).replace(/,/g, '')) === Number(initialValues?.principal);

      await createLoan({
        variables: {
          input: {
            name: form.name.trim(),
            principal: Number(String(form.principal).replace(/,/g, '')),
            startDate: form.startDate,
            endDate: form.endDate,
            nonWorkDayPolicy : form.nonWorkDayPolicy,
            ...(matchesSeed ? { rateSegments: seededSegments } : {}),

          },
        },
      });
      toast.success('Loan created successfully', { id: 'loan-create' });
      setForm(EMPTY_FORM);
      setFieldErrors({});
      onCreated();
    } catch {
      toast.error('Failed to create loan', { id: 'loan-create' });
    }
  };

  const handleClose = () => {
    setForm(EMPTY_FORM);
    setFieldErrors({});
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New Loan">
      <Form onSubmit={handleSubmit}>
        <Field>
          <Label htmlFor="name">Loan Name</Label>
          <Input
            id="name"
            value={form.name}
            onChange={set('name')}
            placeholder="e.g. Acme Bridge Loan"
            $hasError={!!fieldErrors.name}
            aria-invalid={!!fieldErrors.name}
            aria-describedby={fieldErrors.name ? 'err-new-name' : undefined}
          />
          {fieldErrors.name && (
            <FieldError id="err-new-name" role="alert">
              {fieldErrors.name}
            </FieldError>
          )}
        </Field>

        <Field>
          <Label htmlFor="principal">Principal Amount ($)</Label>
          <Input
            id="principal"
            type="number"
            min="1"
            step="0.01"
            value={form.principal}
            onChange={set('principal')}
            placeholder="1,000,000"
            $hasError={!!fieldErrors.principal}
            aria-invalid={!!fieldErrors.principal}
            aria-describedby={fieldErrors.principal ? 'err-new-principal' : undefined}
          />
          {fieldErrors.principal && (
            <FieldError id="err-new-principal" role="alert">
              {fieldErrors.principal}
            </FieldError>
          )}
        </Field>

        <Row>
          <Field>
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={form.startDate}
              onChange={set('startDate')}
              $hasError={!!fieldErrors.startDate}
              aria-invalid={!!fieldErrors.startDate}
              aria-describedby={fieldErrors.startDate ? 'err-new-start' : undefined}
            />
            {fieldErrors.startDate && (
              <FieldError id="err-new-start" role="alert">
                {fieldErrors.startDate}
              </FieldError>
            )}
          </Field>
          <Field>
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={form.endDate}
              onChange={set('endDate')}
              $hasError={!!fieldErrors.endDate}
              aria-invalid={!!fieldErrors.endDate}
              aria-describedby={fieldErrors.endDate ? 'err-new-end' : undefined}
            />
            {fieldErrors.endDate && (
              <FieldError id="err-new-end" role="alert">
                {fieldErrors.endDate}
              </FieldError>
            )}
          </Field>
        </Row>

        {error && <ErrorMessage>{userFacingErrorMessage(error)}</ErrorMessage>}
<Field>
  <Label>
    <Input 
    as="select"
    id="nonWorkDayPolicy"
    value={form.nonWorkDayPolicy}
    onChange={set('nonWorkDayPolicy')}>
         <option value="ALLOWED">Allowed</option>
    <option value="MOVE_TO_PREVIOUS_WORK_DAY">Move to previous work day</option>
    <option value="MOVE_TO_NEXT_WORK_DAY">Move to next work day</option>
    </Input>
  </Label>
</Field>
        <Actions>
          <Button type="button" $variant="ghost" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating…' : 'Create Loan'}
          </Button>
        </Actions>
      </Form>
    </Modal>
  );
}

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.md};
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
  flex: 1;
`;

const Row = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    flex-direction: column;
  }
`;

const Label = styled.label`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Input = styled.input<{ $hasError?: boolean }>`
  padding: 9px 12px;
  width: 100%;
  box-sizing: border-box;
  border: 1px solid
    ${({ $hasError, theme }) => ($hasError ? theme.colors.error : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-family: ${({ theme }) => theme.typography.fontFamily};
  color: ${({ theme }) => theme.colors.textPrimary};
  background: ${({ theme }) => theme.colors.surface};
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &:focus {
    outline: none;
    border-color: ${({ $hasError, theme }) =>
      $hasError ? theme.colors.error : theme.colors.primary};
    box-shadow: 0 0 0 3px
      ${({ $hasError, theme }) =>
        $hasError
          ? `color-mix(in srgb, ${theme.colors.error} 15%, transparent)`
          : theme.colors.primaryLight};
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

const FieldError = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.error};
  line-height: ${({ theme }) => theme.typography.lineHeight.tight};
`;

const ErrorMessage = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.error};
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.sm};
`;
