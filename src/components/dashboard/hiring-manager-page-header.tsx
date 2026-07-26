import type { ComponentProps } from "react";
import { PortalPageHeader } from "@/components/dashboard/portal/portal-ui";

/** @deprecated Prefer PortalPageHeader — kept for HM route imports during layout unification. */
export type HiringManagerPageHeaderProps = ComponentProps<typeof PortalPageHeader>;

export const HiringManagerPageHeader = PortalPageHeader;
