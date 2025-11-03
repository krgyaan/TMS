import { EllipsisVertical } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"

export type ActionItem<T = any> = {
    label: string
    icon?: React.ReactNode
    onClick: (rowData: T) => void
    className?: string
}

type Props<T> = {
    rowData: T
    actions: ActionItem<T>[]
}

export const ActionMenu = <T extends object>({ rowData, actions }: Props<T>) => {
    const [open, setOpen] = useState(false)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const menuRef = useRef<HTMLDivElement>(null)
    const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node
            if (
                (menuRef.current && menuRef.current.contains(target)) ||
                (triggerRef.current && triggerRef.current.contains(target))
            ) {
                return
            }
            setOpen(false)
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [])

    useEffect(() => {
        const updatePos = () => {
            if (!triggerRef.current) return
            const rect = triggerRef.current.getBoundingClientRect()
            // Align right edge of menu (10rem width) with trigger's right
            const width = 160 // w-40 (10rem) assuming 16px root font-size
            const top = rect.bottom + 8 // ~ mt-2 spacing
            const left = rect.right - width
            setMenuPos({ top, left })
        }
        if (open) {
            updatePos()
            window.addEventListener("scroll", updatePos, true)
            window.addEventListener("resize", updatePos)
        }
        return () => {
            window.removeEventListener("scroll", updatePos, true)
            window.removeEventListener("resize", updatePos)
        }
    }, [open])

    return (
        <div className="h-full w-full flex items-center">
            <button
                ref={triggerRef}
                onClick={() => setOpen((prev) => !prev)}
                className="cursor-pointer"
            >
                <EllipsisVertical />
            </button>

            {open && menuPos &&
                createPortal(
                    <div
                        ref={menuRef}
                        className="z-50 w-40 border rounded shadow bg-accent"
                        style={{ position: "fixed", top: menuPos.top, left: menuPos.left }}
                    >
                        {actions.map((action, idx) => (
                            <button
                                key={idx}
                                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-700 ${action.className || ""}`}
                                onClick={() => {
                                    setOpen(false)
                                    action.onClick(rowData)
                                }}
                            >
                                {action.label}
                            </button>
                        ))}
                    </div>,
                    document.body
                )}
        </div>
    )
}
