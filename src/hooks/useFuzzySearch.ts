import Fuse, { type IFuseOptions, type FuseResult } from "fuse.js";
import { useMemo } from "react";

export type SearchableVendor = {
  _id: string;
  companyName: string;
  stageLabel: string;
  categories: string;
  raw: any;
};

const FUSE_OPTIONS: IFuseOptions<SearchableVendor> = {
  keys: [
    { name: "companyName", weight: 0.5 },
    { name: "categories", weight: 0.35 },
    { name: "stageLabel", weight: 0.15 },
  ],
  threshold: 0.35,
  minMatchCharLength: 2,
  includeScore: true,
  includeMatches: true,
};

function buildIndex(fixedApprovals: any): SearchableVendor[] {
  const vendors: SearchableVendor[] = [];

  const add = (arr: any[], stageLabel: string) => {
    (arr || []).forEach((v) => {
      vendors.push({
        _id: v._id,
        companyName: v.companyName || "",
        stageLabel,
        categories: (v.approvalData?.jobCategories || [])
          .map((c: any) => c.category)
          .filter(Boolean)
          .join(", "),
        raw: v,
      });
    });
  };

  add(fixedApprovals.inProgress, "In Progress");
  add(fixedApprovals.pendingL2, "Pending L2");
  add(fixedApprovals.completedL2, "Completed L2");
  add(fixedApprovals.l3, "L3");
  add(fixedApprovals.returned, "Returned");
  add(fixedApprovals.parkRequested, "Park Requested");

  return vendors;
}

export function useFuzzySearch(fixedApprovals: any) {
  const allVendors = useMemo(
    () => buildIndex(fixedApprovals),
    [
      fixedApprovals.inProgress,
      fixedApprovals.pendingL2,
      fixedApprovals.completedL2,
      fixedApprovals.l3,
      fixedApprovals.returned,
      fixedApprovals.parkRequested,
    ],
  );

  const fuse = useMemo(() => new Fuse(allVendors, FUSE_OPTIONS), [allVendors]);

  const search = (query: string): FuseResult<SearchableVendor>[] => {
    if (!query || query.trim().length < 2) return [];
    return fuse.search(query.trim()).slice(0, 12);
  };

  const totalIndexed = allVendors.length;

  return { search, totalIndexed };
}
