import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApolloClient } from '@apollo/client';
import styled from 'styled-components';
import { Button } from '../../components/Button';
import { NewLoanModal } from '../LoanList/NewLoanModal';
import heroImage from '../../assets/home-hero.png';
import bannerImage from '../../assets/baner.jpeg';

export function HomePage() {
  const navigate = useNavigate();
  const apolloClient = useApolloClient();
  const [isModalOpen, setModalOpen] = useState(false);

  return (
    <Page>
      <Hero>
        <HeroCopy>
          <HeroEyebrow>Bullet Loan Management</HeroEyebrow>
          <HeroTitle>Manage bullet loans with clarity and confidence.</HeroTitle>
          <HeroLede>
            Create loans, generate deterministic repayment schedules, and keep full visibility into
            principal, interest, and maturity from a single, reliable surface.
          </HeroLede>
          <HeroActions>
            <Button size="lg" onClick={() => setModalOpen(true)}>
              + New Loan
            </Button>
            <Button size="lg" variant="secondary" onClick={() => navigate('/loans')}>
              View Loans
            </Button>
          </HeroActions>
        </HeroCopy>
        <HeroMedia aria-hidden="true">
          <HeroImageFrame>
            <HeroImage src={heroImage} alt="" loading="eager" />
            <HeroImageScrim />
          </HeroImageFrame>
        </HeroMedia>
      </Hero>

      <Section>
        <SectionEyebrow>How it works</SectionEyebrow>
        <SectionHeading>Three steps, end to end.</SectionHeading>
        <StepsGrid>
          {STEPS.map((step, index) => (
            <StepCard key={step.title}>
              <StepNumber>{String(index + 1).padStart(2, '0')}</StepNumber>
              <StepTitle>{step.title}</StepTitle>
              <StepDescription>{step.description}</StepDescription>
            </StepCard>
          ))}
        </StepsGrid>
      </Section>

      <Section>
        <SectionEyebrow>Why teams use it</SectionEyebrow>
        <SectionHeading>Built for operational clarity.</SectionHeading>
        <BenefitsGrid>
          {BENEFITS.map((benefit) => (
            <BenefitCard key={benefit.title}>
              <BenefitIconWrap aria-hidden="true">{benefit.icon}</BenefitIconWrap>
              <BenefitTitle>{benefit.title}</BenefitTitle>
              <BenefitDescription>{benefit.description}</BenefitDescription>
            </BenefitCard>
          ))}
        </BenefitsGrid>
      </Section>

      <HomeBannerLink to="/" aria-label="Home">
        <HomeBannerImage src={bannerImage} alt="" loading="lazy" />
      </HomeBannerLink>

      <NewLoanModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => {
          setModalOpen(false);
          void apolloClient.refetchQueries({ include: ['GetPortfolioSummary', 'GetLoans'] });
          navigate('/loans');
        }}
      />
    </Page>
  );
}

const STEPS = [
  {
    title: 'Create a loan',
    description:
      'Enter principal, start and end dates. The current prime rate is locked in as a snapshot for auditability.',
  },
  {
    title: 'Generate the schedule',
    description:
      'A deterministic repayment schedule is produced instantly, with interest payments and the final bullet maturity.',
  },
  {
    title: 'Track interest and maturity',
    description:
      'Monitor every loan with a clear view of principal, accruing interest, and the next payment due.',
  },
];

const BENEFITS = [
  {
    title: 'Deterministic schedules',
    description:
      'Repayment plans are reproducible and auditable: the same inputs always produce the same schedule.',
    icon: <CalendarIcon />,
  },
  {
    title: '30/360 interest accuracy',
    description:
      'Interest is calculated using the standard 30/360 day count, matching conventional lending practice.',
    icon: <CalculatorIcon />,
  },
  {
    title: 'Rate snapshot at creation',
    description:
      'Each loan locks its prime rate at creation time, so the rate it was priced with is never lost.',
    icon: <LockIcon />,
  },
  {
    title: 'Full loan visibility',
    description:
      'Every loan, payment, and balance is reachable in one surface, with no digging or reconciliation.',
    icon: <EyeIcon />,
  },
];

function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 9h14" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 3v4M13 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CalculatorIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="4" y="2.5" width="12" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="6.5" y="5" width="7" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="7.5" cy="11" r="0.9" fill="currentColor" />
      <circle cx="10" cy="11" r="0.9" fill="currentColor" />
      <circle cx="12.5" cy="11" r="0.9" fill="currentColor" />
      <circle cx="7.5" cy="14" r="0.9" fill="currentColor" />
      <circle cx="10" cy="14" r="0.9" fill="currentColor" />
      <circle cx="12.5" cy="14" r="0.9" fill="currentColor" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="4" y="9" width="12" height="9" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M7 9V6.5a3 3 0 116 0V9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M2.5 10C4 6.5 6.8 4.5 10 4.5s6 2 7.5 5.5c-1.5 3.5-4.3 5.5-7.5 5.5S4 13.5 2.5 10z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

const Page = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.xxl} ${({ theme }) => theme.spacing.xl};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xxl};

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    padding: ${({ theme }) => theme.spacing.lg} ${({ theme }) => theme.spacing.md};
    gap: ${({ theme }) => theme.spacing.xl};
  }
`;

const Hero = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1.75fr) minmax(0, 1fr);
  align-items: center;
  gap: ${({ theme }) => theme.spacing.xl} ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: ${({ theme }) => theme.spacing.xl} ${({ theme }) => theme.spacing.xxl};
  box-shadow: ${({ theme }) => theme.shadow.sm};
  overflow: hidden;

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: 1fr;
    align-items: stretch;
    gap: ${({ theme }) => theme.spacing.md};
    padding: ${({ theme }) => theme.spacing.lg} ${({ theme }) => theme.spacing.lg};
  }
`;

const HeroCopy = styled.div`
  min-width: 0;
  padding-right: ${({ theme }) => theme.spacing.sm};

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    padding-right: 0;
  }
`;

const HeroEyebrow = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.primary};
  text-transform: uppercase;
  letter-spacing: 1.2px;
  margin-bottom: ${({ theme }) => theme.spacing.sm};
`;

const HeroTitle = styled.h1`
  font-size: 32px;
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  letter-spacing: -0.02em;
  line-height: 1.18;
  color: ${({ theme }) => theme.colors.textPrimary};
  margin-bottom: ${({ theme }) => theme.spacing.md};

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    font-size: 26px;
    margin-bottom: ${({ theme }) => theme.spacing.sm};
  }
`;

const HeroLede = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: ${({ theme }) => theme.typography.lineHeight.relaxed};
  max-width: 36em;
  margin-bottom: ${({ theme }) => theme.spacing.lg};

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    font-size: ${({ theme }) => theme.typography.fontSize.base};
    margin-bottom: ${({ theme }) => theme.spacing.md};
  }
`;

const HeroActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing.sm};

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    gap: ${({ theme }) => theme.spacing.sm};
  }
`;

const HeroMedia = styled.div`
  min-width: 0;
  width: 100%;
  max-width: 100%;
  display: flex;
  justify-content: flex-end;

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    justify-content: center;
  }
`;

const HeroImageFrame = styled.div`
  position: relative;
  width: 100%;
  max-width: 100%;
  height: clamp(168px, 17vw, 220px);
  border-radius: ${({ theme }) => theme.radius.lg};
  overflow: hidden;
  box-shadow: ${({ theme }) => theme.shadow.sm};
  background: ${({ theme }) => theme.colors.background};

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    height: clamp(132px, 36vw, 180px);
    max-width: min(100%, 380px);
    margin-left: auto;
    margin-right: auto;
  }
`;

const HeroImage = styled.img`
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 32%;
`;

const HeroImageScrim = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  background: ${({ theme }) => theme.colors.heroScrim};
`;

const Section = styled.section`
  display: flex;
  flex-direction: column;
`;

const SectionEyebrow = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.primary};
  text-transform: uppercase;
  letter-spacing: 1.2px;
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const SectionHeading = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.textPrimary};
  letter-spacing: -0.01em;
  margin-bottom: ${({ theme }) => theme.spacing.lg};
`;

const StepsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${({ theme }) => theme.spacing.md};

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: 1fr;
  }
`;

const StepCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: ${({ theme }) => theme.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const StepNumber = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.primary};
  letter-spacing: 1.5px;
`;

const StepTitle = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const StepDescription = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: ${({ theme }) => theme.typography.lineHeight.normal};
`;

const BenefitsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: ${({ theme }) => theme.spacing.md};

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    grid-template-columns: 1fr;
  }
`;

const BenefitCard = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: ${({ theme }) => theme.spacing.lg};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.xs};
`;

const BenefitIconWrap = styled.div`
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.primaryLight};
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: ${({ theme }) => theme.spacing.xs};
`;

const BenefitTitle = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const BenefitDescription = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.textSecondary};
  line-height: ${({ theme }) => theme.typography.lineHeight.normal};
`;

const HomeBannerLink = styled(Link)`
  display: block;
  width: 100%;
  max-width: min(520px, 100%);
  margin-left: auto;
  margin-right: auto;
  border-radius: ${({ theme }) => theme.radius.lg};
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.colors.border};
  line-height: 0;
  box-shadow: ${({ theme }) => theme.shadow.sm};
  transition: box-shadow 0.15s ease;

  &:hover {
    box-shadow: ${({ theme }) => theme.shadow.md};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }
`;

const HomeBannerImage = styled.img`
  display: block;
  width: 100%;
  height: auto;
`;
