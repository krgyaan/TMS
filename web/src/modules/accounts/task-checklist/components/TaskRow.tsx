import { Button } from "@/components/ui/button";
import { Badge, CheckCircle2, Clock, Eye } from "lucide-react";
import Timer from "./Timer";
import type { Checklist, ChecklistReport } from "@/modules/accounts/task-checklist/task-checklist.types";
import { format } from "date-fns";


// ==================== Task Row Component for User View ====================
interface TaskRowProps {
    task: ChecklistReport;
    type: "responsibility" | "accountability";
    onViewDetails: (checklist: Checklist) => void;
    onOpenRemark: (reportId: number, type: "responsibility" | "accountability", checklist: Checklist) => void;
}

const TaskRow: React.FC<TaskRowProps> = ({ task, type, onViewDetails, onOpenRemark }) => {
    const isSaturday = task.dueDate ? new Date(task.dueDate).getDay() === 6 : false;
    const canComplete = type === "accountability" ? !!task.respCompletedAt && !task.accCompletedAt : true;

    if (type === "responsibility") {
        return (
            <tr className="border-b hover:bg-muted/30 transition-colors">
                <td className="p-4">
                    <div className="font-medium">{task?.taskName || "-"}</div>
                </td>
                <td className="p-4 text-sm text-muted-foreground">
                    {task.dueDate ? format(new Date(task.dueDate), "dd MMM yyyy, hh:mm a") : "-"}
                </td>
                <td className="p-4">
                    {task.dueDate ? <Timer dueDate={task.dueDate} /> : "-"}
                </td>
                <td className="p-4">
                    <div className="flex gap-2">
                        {task.id && (
                            <>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onViewDetails(task!)}
                                >
                                    <Eye className="h-4 w-4 mr-1" />
                                    Details
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => onOpenRemark(task.id!, "responsibility", task!)}
                                >
                                    Complete
                                </Button>
                            </>
                        )}
                    </div>
                </td>
            </tr>
        );
    }

    return (
        <tr className="border-b hover:bg-muted/30 transition-colors">
            <td className="p-4">
                <div className="font-medium">{task?.taskName || "-"}</div>
            </td>
            <td className="p-4 text-sm">{task?.responsibleUserName || "-"}</td>
            <td className="p-4 text-sm">
                {task.respCompletedAt ? (
                    <Badge variant="secondary" className="font-normal">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {format(new Date(task.respCompletedAt), "dd MMM yyyy")}
                    </Badge>
                ) : (
                    <Badge variant="outline" className="font-normal">Pending</Badge>
                )}
            </td>
            <td className="p-4 text-sm max-w-[200px]">
                <span className="truncate block" title={task.respRemark || ""}>
                    {task.respRemark || "-"}
                </span>
            </td>
            <td className="p-4 text-sm">
                {task.respResultFile ? (
                    <a
                        href={`/uploads/checklist/${task.respResultFile}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                        <Eye className="h-3 w-3" />
                        View
                    </a>
                ) : (
                    "-"
                )}
            </td>
            <td className="p-4">
                {task.dueDate ? <Timer dueDate={task.dueDate} isSaturday={isSaturday} /> : "-"}
            </td>
            <td className="p-4">
                <div className="flex gap-2">
                    {task.id && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onViewDetails(task)}
                        >
                            <Eye className="h-4 w-4" />
                        </Button>
                    )}
                    {task.id && canComplete ? (
                        <Button 
                            size="sm"
                            variant="secondary"
                            onClick={() => onOpenRemark(task.id!, "accountability", task)}
                        >
                            Complete
                        </Button>
                    ) : (
                        !task.accCompletedAt && (
                            <Button size="sm" variant="ghost" disabled title="Waiting for responsible user">
                                <Clock className="h-4 w-4 mr-1" />
                                Waiting
                            </Button>
                        )
                    )}
                </div>
            </td>
        </tr>
    );
};


export default TaskRow;