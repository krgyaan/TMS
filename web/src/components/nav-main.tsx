import { ChevronRight, type LucideIcon } from "lucide-react"
import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom"

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
    SidebarGroup,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from "@/components/ui/sidebar"

export function NavMain({
    items,
}: {
    items: {
        title: string
        url: string
        icon?: LucideIcon
        isActive?: boolean
        items?: {
            title: string
            url: string
        }[]
    }[]
}) {
    const location = useLocation()
    const [openKey, setOpenKey] = useState<string | null>(null)

    useEffect(() => {
        const match = items.find((it) => it.items?.some((s) => location.pathname.startsWith(s.url)))
        if (match) {
            setOpenKey(match.title)
        } else if (!openKey) {
            const firstActive = items.find((it) => it.isActive)
            if (firstActive) setOpenKey(firstActive.title)
        }
    }, [location.pathname, items])

    return (
        <SidebarGroup>
            <SidebarMenu>
                {items.map((item) => {
                    // Render single menu item without dropdown
                    if (!item.items || item.items.length === 0) {
                        const active = location.pathname === item.url || location.pathname.startsWith(item.url + "/")
                        return (
                            <SidebarMenuItem key={item.title}>
                                <SidebarMenuButton
                                    asChild
                                    tooltip={item.title}
                                    isActive={active}
                                >
                                    <NavLink to={item.url}>
                                        {item.icon && <item.icon />}
                                        <span className="text-sm font-medium">{item.title}</span>
                                    </NavLink>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        )
                    }

                    // Render collapsible menu with dropdown
                    const parentActive = item.items.some((s) => location.pathname.startsWith(s.url))
                    const isOpen = openKey === item.title
                    return (
                        <Collapsible
                            key={item.title}
                            asChild
                            open={isOpen}
                            onOpenChange={(open) => setOpenKey(open ? item.title : null)}
                            className="group/collapsible"
                        >
                            <SidebarMenuItem>
                                <CollapsibleTrigger asChild>
                                    <SidebarMenuButton
                                        tooltip={item.title}
                                        data-active={parentActive || isOpen ? "true" : undefined}
                                        className="data-[active=true]:text-primary"
                                    >
                                        {item.icon && <item.icon />}
                                        <span className="text-sm font-medium">{item.title}</span>
                                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                    </SidebarMenuButton>
                                </CollapsibleTrigger>
                                <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                                    <SidebarMenuSub>
                                        {item.items.map((subItem) => {
                                            const active = location.pathname === subItem.url || location.pathname.startsWith(subItem.url + "/")
                                            return (
                                                <SidebarMenuSubItem key={subItem.title}>
                                                    <SidebarMenuSubButton asChild isActive={active}>
                                                        <NavLink to={subItem.url} end={false}>
                                                            <span className="text-sm">{subItem.title}</span>
                                                        </NavLink>
                                                    </SidebarMenuSubButton>
                                                </SidebarMenuSubItem>
                                            )
                                        })}
                                    </SidebarMenuSub>
                                </CollapsibleContent>
                            </SidebarMenuItem>
                        </Collapsible>
                    )
                })}
            </SidebarMenu>
        </SidebarGroup>
    )
}
