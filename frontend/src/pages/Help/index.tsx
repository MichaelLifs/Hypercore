import React from 'react';
import styled from 'styled-components';

export function HelpPage() {
  return (
    <Page>
      <Container>
        {/* Header */}
        <PageHeader>
          <PageTitle>Help &amp; Guide</PageTitle>
          <PageSubtitle>
            Plain language on how this app models bullet loans, interest, and what each column in
            the schedule means.
          </PageSubtitle>
        </PageHeader>

        {/* How It Works */}
        <Section>
          <SectionLabel>Overview</SectionLabel>
          <SectionTitle>How It Works</SectionTitle>
          <FlowGrid>
            {STEPS.map((step, i) => (
              <React.Fragment key={step.title}>
                <StepCard>
                  <StepNumber>{i + 1}</StepNumber>
                  <StepBody>
                    <StepTitle>{step.title}</StepTitle>
                    <StepDescription>{step.description}</StepDescription>
                  </StepBody>
                </StepCard>
                {i < STEPS.length - 1 && <StepConnector aria-hidden="true" />}
              </React.Fragment>
            ))}
          </FlowGrid>
        </Section>

        <ContentGrid>
          <InfoCard>
            <InfoCardTagRow>
              <InfoCardIcon aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect
                    x="3"
                    y="3"
                    width="18"
                    height="18"
                    rx="3"
                    stroke="currentColor"
                    strokeWidth="1.75"
                  />
                  <path
                    d="M8 12h8M8 8h8M8 16h5"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                </svg>
              </InfoCardIcon>
              <InfoCardTagLabel>Concept</InfoCardTagLabel>
            </InfoCardTagRow>
            <InfoCardTitle>What Is a Bullet Loan?</InfoCardTitle>
            <BulletList>
              {BULLET_LOAN_POINTS.map((point) => (
                <BulletItem key={point}>
                  <BulletDot aria-hidden="true" />
                  <span>{point}</span>
                </BulletItem>
              ))}
            </BulletList>
          </InfoCard>

          <InfoCard>
            <InfoCardTagRow>
              <InfoCardIcon aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </svg>
              </InfoCardIcon>
              <InfoCardTagLabel>Calculation</InfoCardTagLabel>
            </InfoCardTagRow>
            <InfoCardTitle>How Interest Is Calculated</InfoCardTitle>
            <BulletList>
              {INTEREST_POINTS.map((point) => (
                <BulletItem key={point}>
                  <BulletDot aria-hidden="true" />
                  <span>{point}</span>
                </BulletItem>
              ))}
            </BulletList>
          </InfoCard>

          <InfoCard $wide>
            <InfoCardTagRow>
              <InfoCardIcon aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect
                    x="3"
                    y="4"
                    width="18"
                    height="17"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.75"
                  />
                  <path
                    d="M3 9h18"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                  <path
                    d="M8 2v4M16 2v4"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                  />
                </svg>
              </InfoCardIcon>
              <InfoCardTagLabel>Reference</InfoCardTagLabel>
            </InfoCardTagRow>
            <InfoCardTitle>Understanding the Repayment Schedule</InfoCardTitle>
            <ScheduleColumns>
              {SCHEDULE_COLUMNS.map((col) => (
                <ScheduleColumnItem key={col.label}>
                  <ScheduleColumnLabel>{col.label}</ScheduleColumnLabel>
                  <ScheduleColumnDesc>{col.desc}</ScheduleColumnDesc>
                </ScheduleColumnItem>
              ))}
            </ScheduleColumns>
          </InfoCard>
        </ContentGrid>
      </Container>
    </Page>
  );
}

const STEPS = [
  {
    title: 'Create a loan',
    description:
      'Enter the loan name, principal amount, start date, and maturity date. No manual rate entry. The prime rate is fetched and locked in automatically.',
  },
  {
    title: 'Rate snapshot',
    description:
      'The current Bank Prime Loan Rate is fetched from FRED and stored as a snapshot. This locks the rate history at creation time so the schedule is always reproducible.',
  },
  {
    title: 'Build the schedule',
    description:
      'A full repayment schedule is generated instantly, with one row per payment date. Interest accrues on a 30/360 basis, which is standard for bullet facilities.',
  },
  {
    title: 'Track to maturity',
    description:
      "During the loan term you pay interest only. On maturity the full principal is due in a single bullet payment, together with that period's accrued interest.",
  },
];

const BULLET_LOAN_POINTS = [
  'Principal is due in full on the maturity date, not spread across the life of the loan.',
  'Between start and maturity you pay interest each period. Principal does not amortize month to month.',
  'The amount you owe stays flat until the balloon, then drops to zero after the final principal payment.',
  'The last row is the big one: it carries the full principal plus the interest for that final period.',
];

const INTEREST_POINTS = [
  'Accrual uses 30/360: every month counts as 30 days and every year as 360, which is standard for this type of facility.',
  'For a fixed annual rate, monthly interest is approximately principal × rate ÷ 12.',
  'The rate is fixed at the moment the loan is created. Future changes to the prime rate do not affect existing loans.',
  'If the prime rate changed within your loan period, each rate is applied only for the days it was actually in effect.',
];

const SCHEDULE_COLUMNS = [
  {
    label: 'Payment Date',
    desc: 'When this payment is due. One row per month from start date through maturity.',
  },
  {
    label: 'Payment Type',
    desc: 'Interest for monthly coupon payments; Principal & Interest for the final maturity row where the principal balloon is repaid.',
  },
  {
    label: 'Principal',
    desc: '$0 on all interim dates. On the maturity row it shows the full principal amount coming due.',
  },
  {
    label: 'Interest',
    desc: 'Interest accrued for that period, calculated using 30/360 at the rate locked in at loan creation.',
  },
  {
    label: 'Total Payment',
    desc: 'The amount due that period: interest only on interim dates, principal plus interest on the final row.',
  },
  {
    label: 'Remaining Balance',
    desc: 'Outstanding principal after the payment is applied. Stays flat at the loan amount until the maturity row, where it drops to zero.',
  },
];

const Page = styled.div`
  background: ${({ theme }) => theme.colors.background};
  min-height: calc(100vh - 64px);
  padding-bottom: ${({ theme }) => theme.spacing.xxl};
`;

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xxl} ${({ theme }) => theme.spacing.xl};

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    padding: ${({ theme }) => theme.spacing.xl} ${({ theme }) => theme.spacing.md};
  }
`;

// Page header
const PageHeader = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.xxl};
`;

const PageTitle = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize.xxl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.textPrimary};
  letter-spacing: -0.02em;
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const PageSubtitle = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
  max-width: 560px;
`;

// Sections
const Section = styled.section`
  margin-bottom: ${({ theme }) => theme.spacing.xxl};
`;

const SectionLabel = styled.span`
  display: inline-block;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.textPrimary};
  letter-spacing: -0.01em;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

// Flow steps
const FlowGrid = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0;

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    flex-direction: column;
  }
`;

const StepCard = styled.div`
  flex: 1;
  min-width: 0;
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: ${({ theme }) => theme.spacing.lg};
  box-shadow: ${({ theme }) => theme.shadow.sm};

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    width: 100%;
  }
`;

const StepConnector = styled.div`
  flex-shrink: 0;
  width: 32px;
  height: 2px;
  margin-top: 36px;
  background: ${({ theme }) => theme.colors.border};
  position: relative;

  &::after {
    content: '';
    position: absolute;
    right: -1px;
    top: -4px;
    width: 0;
    height: 0;
    border-left: 7px solid ${({ theme }) => theme.colors.border};
    border-top: 5px solid transparent;
    border-bottom: 5px solid transparent;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    width: 2px;
    height: 24px;
    margin-top: 0;
    margin-left: 20px;

    &::after {
      right: auto;
      top: auto;
      bottom: -1px;
      left: -4px;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-top: 7px solid ${({ theme }) => theme.colors.border};
      border-bottom: none;
    }
  }
`;

const StepNumber = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ theme }) => theme.colors.primaryLight};
  color: ${({ theme }) => theme.colors.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
  flex-shrink: 0;
`;

const StepBody = styled.div``;

const StepTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.textPrimary};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const StepDescription = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
`;

// Content grid
const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing.lg};
  margin-bottom: ${({ theme }) => theme.spacing.xxl};

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: 1fr;
  }
`;

const InfoCard = styled.div<{ $wide?: boolean }>`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: ${({ theme }) => theme.spacing.xl};
  box-shadow: ${({ theme }) => theme.shadow.sm};

  ${({ $wide }) => $wide && 'grid-column: 1 / -1;'}

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-column: 1;
  }
`;

const InfoCardTagRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

const InfoCardIcon = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.primaryLight};
  color: ${({ theme }) => theme.colors.primary};
`;

const InfoCardTagLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.primary};
  line-height: 1;
`;

const InfoCardTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.textPrimary};
  letter-spacing: -0.01em;
  margin-bottom: ${({ theme }) => theme.spacing.md};
`;

// Bullet list
const BulletList = styled.ul`
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.sm};
`;

const BulletItem = styled.li`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
`;

const BulletDot = styled.span`
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ theme }) => theme.colors.primary};
  margin-top: 7px;
`;

// Schedule columns grid
const ScheduleColumns = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${({ theme }) => theme.spacing.md};

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    grid-template-columns: 1fr;
  }
`;

const ScheduleColumnItem = styled.div`
  padding: ${({ theme }) => theme.spacing.md};
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
`;

const ScheduleColumnLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const ScheduleColumnDesc = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
`;
