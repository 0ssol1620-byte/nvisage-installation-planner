/**
 * Source document registry (blueprint §2.3, §23).
 * IDs D01–D06 keep the blueprint numbering. D04 is listed in the blueprint but is NOT present in the
 * local asset folder; its role (N2 Ready Zone hierarchy) is covered by D11 (N-Hub Lite manual).
 * `file` names are relative to the NVISAGE_Assets folder and are used by scripts/verify_spec_sources.py.
 */

export type EvidenceClass = 'OFFICIAL' | 'USER_CONFIRMED' | 'MEASURED' | 'REFERENCE' | 'PROPOSED';

export type SourceDoc = {
  id: string;
  title: string;
  file: string | null;
  docNumber?: string;
  revision: string;
  revisionDate?: string;
  evidence: EvidenceClass;
  /** True when the document can be cited to customers. Sales sheets are cross-reference only. */
  customerCitable: boolean;
  note?: string;
  /** Public web page (Carl's Place product pages and spec sheets). */
  web?: boolean;
};

export const SOURCES: Record<string, SourceDoc> = {
  D01: {
    id: 'D01', title: 'N1 Launch Monitor User Manual', file: 'Nvisage 공식 문서/User Manual_N1_V1.3_EN.pdf',
    docNumber: 'D-25-444', revision: '1.3', revisionDate: '2026-06-29', evidence: 'OFFICIAL', customerCitable: true,
  },
  D02: {
    id: 'D02', title: 'N2 Launch Monitor User Manual', file: 'Nvisage 공식 문서/User Manual_N2_V1.2_EN.pdf',
    docNumber: 'D-26-109', revision: '1.2', evidence: 'OFFICIAL', customerCitable: true,
  },
  D03: {
    id: 'D03', title: 'N2 Installation Guide', file: 'Nvisage 공식 문서/N2 Installation Guide_V1.0_EN.pdf',
    docNumber: 'D-26-829', revision: '1.0', revisionDate: '2026-05-20', evidence: 'OFFICIAL', customerCitable: true,
  },
  D04: {
    id: 'D04', title: 'N2 Calibration & Separate Ready Zone Manual (KO)', file: null,
    revision: '1.0', evidence: 'OFFICIAL', customerCitable: false,
    note: 'Referenced by the blueprint but not present in the local asset folder (2026-10-08). Superseded for planner use by D11.',
  },
  D05: {
    id: 'D05', title: 'NEO-E Launch Monitor User Manual', file: 'Nvisage 공식 문서/User Manual_NEO-E_V1.6_EN.pdf',
    docNumber: 'D-25-513', revision: '1.6', evidence: 'OFFICIAL', customerCitable: true,
  },
  D06: {
    id: 'D06', title: 'Reseller Spec Sheet', file: 'Spec Sheet.xlsx', revision: 'undated', evidence: 'REFERENCE',
    customerCitable: false,
    note: 'Sales summary. Several values differ from the manuals (see docs/source-evidence/SPEC_DISCREPANCIES.md). Never used for rules.',
  },
  D10: {
    id: 'D10', title: 'N1 Installation Guide', file: 'Nvisage 공식 문서/N1 Installation Guide_V1.0_EN.pdf',
    docNumber: 'D-26-1243', revision: '1.0', revisionDate: '2026-06-30', evidence: 'OFFICIAL', customerCitable: true,
  },
  D11: {
    id: 'D11', title: 'N-Hub Lite User Manual', file: 'Nvisage 공식 문서/User Manual_N-Hub Lite_EN.pdf',
    docNumber: 'D-26-1892', revision: '1.0', evidence: 'OFFICIAL', customerCitable: true,
  },
  D12: {
    id: 'D12', title: 'NEO-E Quick Start Guide', file: 'Nvisage 공식 문서/Quick Start Guide_NEO-E_V1.4_EN.pdf',
    docNumber: 'D-25-739', revision: '1.4', evidence: 'OFFICIAL', customerCitable: true,
  },
  // Carl's Place (NVISAGE reseller) — enclosure, mat and projector data. Titles shown to customers are product names. Spec sheets archived 2026-10-12.
  C01: {
    id: 'C01', title: 'DIY Golf Simulator Enclosure Kit — Product Specifications Sheet', file: 'nvisage-3d-planner/docs/source-evidence/carls/DIY Golf Simulator Enclosure Kit Specifications.pdf',
    revision: '2026-10-12', evidence: 'REFERENCE', customerCitable: true,
    web: true, // url: https://www.carlofet.com/hubfs/Product%20Documents/DIY/DIY%20Golf%20Simulator%20Enclosure%20Kit%20Specifications.pdf
  },
  C02: {
    id: 'C02', title: 'Pro Golf Simulator Enclosure Kit — Product Specifications Sheet', file: 'nvisage-3d-planner/docs/source-evidence/carls/Pro Golf Enclosure Kit Specifications.pdf',
    revision: '2026-10-12', evidence: 'REFERENCE', customerCitable: true,
    web: true, // url: https://hubspot.carlofet.com/hubfs/Product%20Documents/Pro/Pro%20Golf%20Enclosure%20Kit%20Specifications.pdf
  },
  C03: {
    id: 'C03', title: 'Curved Golf Simulator Enclosure Kit — Product Specifications Sheet', file: 'nvisage-3d-planner/docs/source-evidence/carls/Curved Golf Simulator Enclosure Kit Specifications.pdf',
    revision: '2026-10-12', evidence: 'REFERENCE', customerCitable: true,
    web: true, // url: https://hubspot.carlofet.com/hubfs/Product%20Documents/Curved/Curved%20Golf%20Simulator%20Enclosure%20Kit%20Specifications.pdf
  },
  C04: {
    id: 'C04', title: 'DIY Golf Simulator Enclosure Kit — product page', file: null, revision: '2026-10-12', evidence: 'REFERENCE', customerCitable: true,
    web: true, // url: https://shop.carlofet.com/diy-golf-simulator-enclosure-kit-with-impact-screen
  },
  C05: {
    id: 'C05', title: 'Golf simulator enclosure installation guidance — product page', file: null, revision: '2026-10-12', evidence: 'REFERENCE', customerCitable: true,
    web: true, // url: https://shop.carlofet.com/nvisage-neo-e-bundle-rtg
  },
  C07: {
    id: 'C07', title: 'HotShot Golf Mat System — product page', file: null, revision: '2026-10-12', evidence: 'REFERENCE', customerCitable: true,
    web: true, // url: https://shop.carlofet.com/carls-hotshot-golf-mat-system
  },
  C08: {
    id: 'C08', title: 'BenQ AK700ST — product page', file: null, revision: '2026-10-12', evidence: 'REFERENCE', customerCitable: true,
    web: true, // url: https://shop.carlofet.com/benq-ak700st-golf-simulator-projector
  },
  C09: {
    id: 'C09', title: 'BenQ AH700ST — product page', file: null, revision: '2026-10-12', evidence: 'REFERENCE', customerCitable: true,
    web: true, // url: https://shop.carlofet.com/benq-ah700st-golf-simulator-projector
  },
  C10: {
    id: 'C10', title: 'LG ProBeam BU53RG — product page', file: null, revision: '2026-10-12', evidence: 'REFERENCE', customerCitable: true,
    web: true, // url: https://shop.carlofet.com/lg-probeam-bu53rg-golf-simulator-projector
  },
};

export type Citation = {
  doc: keyof typeof SOURCES;
  page: number;
  /** Exact text as extracted from the PDF page; verified by scripts/verify_spec_sources.py. */
  quote?: string;
  /** For facts that exist only in a drawing (no extractable text) — needs manual review. */
  diagram?: string;
};

export function citationLabel(c: Citation): string {
  const d = SOURCES[c.doc];
  if (!d) return String(c.doc);
  if (d.web && !d.file) return d.title;
  if (d.web) return `${d.title}, p.${c.page}`;
  return `${d.title} Rev.${d.revision}, p.${c.page}`;
}
