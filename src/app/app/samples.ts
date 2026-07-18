/**
 * Batch 32 — instant sample profiles. One click on an empty workspace
 * fills a realistic profile so the product shows its value in seconds.
 */
import { emptyProfile } from "@/lib/tax-engine";
import type { TaxProfile } from "@/lib/tax-engine";

export interface Sample {
  id: string;
  label: string;
  blurb: string;
  message: string;
  profile: TaxProfile;
}

function base(): TaxProfile {
  return emptyProfile();
}

export const SAMPLES: Sample[] = [
  {
    id: "salaried12",
    label: "₹12L salaried, metro renter",
    blurb: "₹1L/month, pays ₹25k rent in a metro, invests in 80C",
    message:
      "Loaded the ₹12L salaried sample — metro city, ₹25k/month rent, ₹1.5L in 80C, ₹80k TDS already deducted. Tweak anything in the Planner tab, or tell me your real numbers whenever you're ready.",
    profile: {
      ...base(),
      salary: {
        grossSalary: 1_200_000, basicPlusDA: 480_000, hraReceived: 240_000,
        rentPaid: 300_000, isMetroCity: true, employerNpsContribution: 0, professionalTax: 2_400,
      },
      deductions: { ...base().deductions, section80C: 150_000, section80D_selfFamily: 15_000 },
      taxesPaid: 80_000,
    },
  },
  {
    id: "senior28",
    label: "₹28L senior engineer",
    blurb: "High earner with ELSS, NPS and employer NPS",
    message:
      "Loaded the ₹28L senior-engineer sample — maxed 80C, ₹50k self NPS, employer NPS, metro rent. This is where the optimizer really earns its keep — check the Planner tab.",
    profile: {
      ...base(),
      salary: {
        grossSalary: 2_800_000, basicPlusDA: 1_120_000, hraReceived: 560_000,
        rentPaid: 480_000, isMetroCity: true, employerNpsContribution: 60_000, professionalTax: 2_400,
      },
      deductions: {
        ...base().deductions,
        section80C: 150_000, section80CCD1B: 50_000, section80D_selfFamily: 25_000,
      },
      taxesPaid: 450_000,
    },
  },
  {
    id: "freelancer15",
    label: "₹15L freelancer (44ADA)",
    blurb: "Presumptive scheme — half of receipts taxable",
    message:
      "Loaded the ₹15L freelancer sample under the presumptive 44ADA scheme — ₹7.5L taxable. Note the advance-tax calendar in the Planner: freelancers get no TDS cushion.",
    profile: {
      ...base(),
      business: { netIncome: 750_000, presumptive: true },
      deductions: { ...base().deductions, section80C: 150_000, section80D_selfFamily: 20_000 },
      taxesPaid: 0,
    },
  },
];
