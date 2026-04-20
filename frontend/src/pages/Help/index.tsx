import React from 'react';
import styled from 'styled-components';

export function HelpPage() {
  return (
    <Page>
      <Container>
        <PageHeader>
          <PageTitle>Help &amp; Guide</PageTitle>
          <PageSubtitle>
            A quick guide to how this product models a <KeyTerm>Bullet Loan</KeyTerm>, calculates
            {' '}
            <KeyTerm>Interest</KeyTerm>, and explains each schedule column in plain language.
          </PageSubtitle>
          <AnchorNav aria-label="Help sections">
            {SECTION_LINKS.map((link) => (
              <AnchorLink key={link.href} href={link.href}>
                {link.label}
              </AnchorLink>
            ))}
          </AnchorNav>
        </PageHeader>

        <Section id="overview">
          <SectionLabel>Overview</SectionLabel>
          <SectionTitle>How It Works</SectionTitle>
          <SectionIntro>
            Businesses often choose <KeyTerm>bullet loans</KeyTerm> when they need funding now and
            expect larger cash inflows later, such as project completion, inventory turns, or asset
            sales. This structure keeps periodic payments lighter during the term and concentrates
            principal repayment at maturity.
          </SectionIntro>
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
          <InfoCard id="concept">
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

          <InfoCard id="calculation">
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

          <InfoCard $wide id="schedule">
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
    title: 'Create the loan',
    description:
      'Enter a name, start date, maturity date, and principal. The app automatically captures the market rate, so setup stays fast and consistent.',
  },
  {
    title: 'Lock the rate snapshot',
    description:
      'We fetch Bank Prime Loan Rate data from FRED and store a snapshot at creation time. That snapshot keeps your results reproducible for audits, reviews, and team handoffs.',
  },
  {
    title: 'Generate the schedule',
    description:
      'The platform builds one row per payment date automatically. Interest accrues using the 30/360 convention, the standard approach for many bullet facilities.',
  },
  {
    title: 'Track to maturity',
    description:
      'During the term, payments are interest-only. On maturity, the full principal is paid in one bullet payment together with final-period interest.',
  },
];

const BULLET_LOAN_POINTS = [
  'In a Bullet Loan, Principal is repaid in full on the maturity date, not gradually over time.',
  'During the loan term, you typically pay Interest only, which helps protect near-term cash flow.',
  'Outstanding Principal stays flat until maturity, then drops to zero after the final payment.',
  'The last schedule row combines full Principal plus that final period of Interest.',
];

const INTEREST_POINTS = [
  'Accrual uses 30/360: each month counts as 30 days and each year as 360 days.',
  'For a fixed annual rate, monthly Interest is approximately Principal × rate ÷ 12.',
  'The rate is snapshotted when the loan is created; later market changes do not rewrite existing schedules.',
  'If rates changed during the covered period, each rate is applied only to the days it was active.',
];

const SCHEDULE_COLUMNS = [
  {
    label: 'Payment Date',
    desc: 'Due date for that row. The schedule includes one row per payment period from start through maturity.',
  },
  {
    label: 'Payment Type',
    desc: 'Shows whether the row is Interest-only or the final Principal + Interest maturity payment.',
  },
  {
    label: 'Principal',
    desc: 'Usually $0 during the term. At maturity, it shows the full Principal amount due.',
  },
  {
    label: 'Interest',
    desc: 'Interest accrued for that period using the 30/360 day-count and the stored rate snapshot.',
  },
  {
    label: 'Total Payment',
    desc: 'Total amount due on that date: Interest-only on interim rows, then Principal + Interest at maturity.',
  },
  {
    label: 'Remaining Balance',
    desc: 'Outstanding Principal after payment. It remains flat through the term, then drops to zero at maturity.',
  },
];

const SECTION_LINKS = [
  { label: 'Overview', href: '#overview' },
  { label: 'Concept', href: '#concept' },
  { label: 'Calculation', href: '#calculation' },
  { label: 'Schedule', href: '#schedule' },
];

const Page = styled.div`
  background: ${({ theme }) => theme.colors.background};
  min-height: calc(100vh - 64px);
  padding-bottom: ${({ theme }) => theme.spacing.xxl};
  scroll-behavior: smooth;
`;

const Container = styled.div`
  max-width: 1080px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xxl} ${({ theme }) => theme.spacing.xl};

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    padding: ${({ theme }) => theme.spacing.xl} ${({ theme }) => theme.spacing.md};
  }
`;

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
  line-height: 1.75;
  max-width: 720px;
`;

const AnchorNav = styled.nav`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};
  margin-top: ${({ theme }) => theme.spacing.md};
`;

const AnchorLink = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 10px;
  border-radius: ${({ theme }) => theme.radius.full};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textSecondary};
  background: ${({ theme }) => theme.colors.surface};
  text-decoration: none;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  transition:
    border-color 0.15s ease,
    color 0.15s ease,
    background 0.15s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.primaryLight};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const Section = styled.section`
  margin-bottom: calc(${({ theme }) => theme.spacing.xxl} + ${({ theme }) => theme.spacing.sm});
  scroll-margin-top: 96px;
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

const SectionIntro = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.75;
  max-width: 780px;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const FlowGrid = styled.div`
  display: flex;
  align-items: stretch;
  gap: ${({ theme }) => theme.spacing.md};

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    flex-direction: column;
    align-items: stretch;
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
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: ${({ theme }) => theme.shadow.md};
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    width: 100%;
  }
`;

const StepConnector = styled.div`
  flex-shrink: 0;
  align-self: center;
  width: 34px;
  height: 2px;
  background: ${({ theme }) => `color-mix(in srgb, ${theme.colors.primary} 45%, ${theme.colors.border})`};
  position: relative;

  &::after {
    content: '';
    position: absolute;
    right: -1px;
    top: -4px;
    width: 0;
    height: 0;
    border-left: 7px solid
      ${({ theme }) => `color-mix(in srgb, ${theme.colors.primary} 45%, ${theme.colors.border})`};
    border-top: 5px solid transparent;
    border-bottom: 5px solid transparent;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    align-self: center;
    width: 2px;
    height: 24px;
    margin-left: 0;

    &::after {
      right: auto;
      top: auto;
      bottom: -1px;
      left: -4px;
      border-left: 5px solid transparent;
      border-right: 5px solid transparent;
      border-top: 7px solid
        ${({ theme }) => `color-mix(in srgb, ${theme.colors.primary} 45%, ${theme.colors.border})`};
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
  line-height: 1.7;
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing.xl};
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
  scroll-margin-top: 96px;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: ${({ theme }) => theme.shadow.md};
  }

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
  line-height: 1.7;
`;

const BulletDot = styled.span`
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  border-radius: ${({ theme }) => theme.radius.full};
  background: ${({ theme }) => theme.colors.primary};
  margin-top: 7px;
`;

const ScheduleColumns = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${({ theme }) => theme.spacing.lg};

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
  transition:
    border-color 0.15s ease,
    background 0.15s ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.surface};
  }
`;

const ScheduleColumnLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  text-transform: none;
  letter-spacing: 0.01em;
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const ScheduleColumnDesc = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: 1.7;
`;

const KeyTerm = styled.strong`
  color: ${({ theme }) => theme.colors.primary};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
`;
