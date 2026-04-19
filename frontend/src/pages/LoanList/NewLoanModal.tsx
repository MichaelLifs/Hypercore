import React, { useState } from 'react';
import styled from 'styled-components';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';

interface NewLoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface FormState {
  name: string;
  principal: string;
  startDate: string;
  endDate: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  principal: '',
  startDate: '',
  endDate: '',
};

/**
 * Form stub — mutation wiring: Phase 3.
 */
export function NewLoanModal({ isOpen, onClose, onCreated: _onCreated }: NewLoanModalProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Phase 3: call useMutation(CREATE_LOAN)
    console.log('Create loan (Phase 3):', form);
  };

  const handleClose = () => {
    setForm(EMPTY_FORM);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New Loan">
      <Form onSubmit={handleSubmit}>
        <Field>
          <Label htmlFor="name">Loan Name</Label>
          <Input id="name" value={form.name} onChange={set('name')} required placeholder="e.g. Acme Bridge Loan" />
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
            required
            placeholder="1,000,000"
          />
        </Field>

        <Row>
          <Field>
            <Label htmlFor="startDate">Start Date</Label>
            <Input id="startDate" type="date" value={form.startDate} onChange={set('startDate')} required />
          </Field>
          <Field>
            <Label htmlFor="endDate">End Date</Label>
            <Input id="endDate" type="date" value={form.endDate} onChange={set('endDate')} required />
          </Field>
        </Row>

        <Actions>
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit">Create Loan</Button>
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
`;

const Label = styled.label`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Input = styled.input`
  padding: 9px 12px;
  border: 1.5px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-family: ${({ theme }) => theme.typography.fontFamily};
  color: ${({ theme }) => theme.colors.textPrimary};
  background: ${({ theme }) => theme.colors.surface};
  transition: border-color 0.15s ease;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary};
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.sm};
`;
