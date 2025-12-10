/* eslint-disable prettier/prettier */
// src/pages/staff/approvals/stageHelpers.ts

export const APPROVAL_STAGES = ["A", "B", "C", "D", "E", "F", "G"] as const;
export type ApprovalStage = (typeof APPROVAL_STAGES)[number];

const deriveLevel = (flags: any): number => {
    // 🔑 Single source of truth:
    // Prefer flags.approvals.level if present (new shape),
    // else fallback to flags.level (old shape), else 0 (Stage A).
    if (typeof flags?.approvals?.level === "number") return flags.approvals.level;
    if (typeof flags?.level === "number") return flags.level;
    return 0;
};

export const getStageFromFlags = (flags: any): ApprovalStage => {
    const level = deriveLevel(flags);
    return APPROVAL_STAGES[level] || "A";
};

export const getNextStageFromFlags = (flags: any): ApprovalStage | undefined => {
    const level = deriveLevel(flags);
    return APPROVAL_STAGES[level + 1];
};

// Used by export logic
export const getL2PendingStage = (flags: any): ApprovalStage => {
    return getStageFromFlags(flags);
};

// Your previous rule for when to show End Users
export const shouldShowEndUsers = (activeFilter: string): boolean => {
    return activeFilter === "C"
};


// Your previous rule for when to show End Users
export const shouldShowUnverified = (activeFilter: string): boolean => {
    return activeFilter === "B" || activeFilter === "C" || activeFilter === "D";
};

export const shouldShowUnchecked = (activeFilter: string): boolean => {
    return activeFilter === "A";
};

// Your previous rule for when to show End Users
export const shouldShowVerified = (activeFilter: string): boolean => {
    return activeFilter === "E" || activeFilter === "F" || activeFilter === "G";
};