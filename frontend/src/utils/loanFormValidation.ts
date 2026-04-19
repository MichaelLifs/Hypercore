export interface LoanFormState {
  name: string;
  principal: string;
  startDate: string;
  endDate: string;
}

export interface LoanFormErrors {
  name?: string;
  principal?: string;
  startDate?: string;
  endDate?: string;
}

export function validateLoanForm(form: LoanFormState): LoanFormErrors {
  const errors: LoanFormErrors = {};
  const principal = Number(String(form.principal).replace(/,/g, ''));

  if (!form.name.trim()) {
    errors.name = 'Loan name is required';
  }

  if (!String(form.principal).trim()) {
    errors.principal = 'Principal amount is required';
  } else if (!Number.isFinite(principal) || principal <= 0) {
    errors.principal = 'Enter a positive amount';
  }

  if (!form.startDate) {
    errors.startDate = 'Start date is required';
  }
  if (!form.endDate) {
    errors.endDate = 'End date is required';
  } else if (form.startDate && form.endDate <= form.startDate) {
    errors.endDate = 'End date must be after start date';
  }

  return errors;
}

export function hasFormErrors(errors: LoanFormErrors): boolean {
  return Object.values(errors).some(Boolean);
}
