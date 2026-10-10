import * as React from "react";
import { Link, useLocation } from "react-router-dom";

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { buildBreadcrumbs } from "@/lib/breadcrumbs";
import { navMain } from "@/lib/nav-config";

export function AppBreadcrumb() {
    const { pathname } = useLocation();

    const crumbs = React.useMemo(() => buildBreadcrumbs(pathname, navMain), [pathname]);

    const lastIndex = crumbs.length - 1;

    return (
        <Breadcrumb>
            <BreadcrumbList>
                {crumbs.map((crumb, index) => (
                    <React.Fragment key={`${crumb.label}-${index}`}>
                        {index > 0 && <BreadcrumbSeparator />}
                        <BreadcrumbItem className={index > 0 && index < lastIndex ? "hidden sm:inline-flex" : undefined}>
                            {crumb.isCurrent ? (
                                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                            ) : crumb.href ? (
                                <BreadcrumbLink asChild>
                                    <Link to={crumb.href}>{crumb.label}</Link>
                                </BreadcrumbLink>
                            ) : (
                                <span className="text-muted-foreground">{crumb.label}</span>
                            )}
                        </BreadcrumbItem>
                    </React.Fragment>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
    );
}
