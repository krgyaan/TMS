import { ActionMenu, type ActionItem } from "@/components/ui/ActionMenu"

export function createActionColumnRenderer<T extends object>(actions: ActionItem<T>[]) {
    return (props: { data: T }) => {
        return <ActionMenu rowData={props.data} actions={actions} />
    }
}
