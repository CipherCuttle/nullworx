export type LabDisposition = "INTEGRATED" | "BLOCKED" | "NOT_INTEGRATED";

export type LabAdmission =
  | "LOCAL_APPROVED"
  | "OWNER_REVIEW"
  | "EXPERIMENTAL"
  | "REFERENCE_ONLY";

export type LabFamily =
  | "Character fields"
  | "Living typography"
  | "Visual materials"
  | "Reactive signal UI"
  | "Material × mask";

export interface LabDependency {
  name: string;
  version: string;
  license: string;
  note?: string;
}

export interface LabSourceFile {
  path: string;
  sha256?: string;
  role: string;
}

export interface LabSource {
  origin: string;
  commit?: string;
  head?: string;
  path: string;
  treeSha256?: string;
  hashMethod?: string;
  files?: readonly LabSourceFile[];
  notes: readonly string[];
}

export interface LabLicense {
  code: string;
  assets: string;
  redistribution: "allowed" | "restricted" | "unknown";
  notes: string;
  notices: readonly string[];
}

export interface LabCapabilities {
  technology: string;
  webgl: "WebGL 2" | "WebGL 1" | "none";
  clientOnly: boolean;
  pointer: boolean;
  reducedMotion: string;
  browsers: readonly string[];
}

export interface LabVerification {
  status: "VERIFIED" | "PARTIAL" | "UNVERIFIED";
  notes: readonly string[];
}

export interface LabEntry {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  family: LabFamily;
  summary: string;
  disposition: LabDisposition;
  admission: LabAdmission;
  route?: string;
  implementation?: string;
  source: LabSource;
  dependencies: readonly LabDependency[];
  license: LabLicense;
  capabilities: LabCapabilities;
  verification: LabVerification;
  blocker?: string;
}

export const ADMISSION_COPY: Record<LabAdmission, string> = {
  LOCAL_APPROVED: "Approved for local use",
  OWNER_REVIEW: "Owner review pending",
  EXPERIMENTAL: "Experimental",
  REFERENCE_ONLY: "Reference only",
};

export const DISPOSITION_COPY: Record<LabDisposition, string> = {
  INTEGRATED: "Integrated preview",
  BLOCKED: "Blocked",
  NOT_INTEGRATED: "Not integrated",
};
