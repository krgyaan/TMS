// src/modules/accounts/checklist/components/ChecklistForm.tsx

import React, { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

import { FREQUENCY_OPTIONS, WEEKDAYS, type Checklist } from "../task-checklist.types";

// Validation Schema
const checklistFormSchema = z
    .object({
        taskName: z.string().min(1, "Task name is required").max(255),
        description: z.string().optional(),
        frequency: z.enum(["Daily", "Weekly", "Monthly", "Quarterly", "Annual"], {
            required_error: "Please select a frequency",
        }),
        frequencyCondition: z.number().int().optional().nullable(),
        responsibility: z.string().min(1, "Please select a responsible user"),
        accountability: z.string().min(1, "Please select an accountable user"),
    })
    .refine(
        (data) => {
            if (data.frequency === "Weekly") {
                return (
                    data.frequencyCondition !== undefined &&
                    data.frequencyCondition !== null &&
                    data.frequencyCondition >= 0 &&
                    data.frequencyCondition <= 6
                );
            }
            return true;
        },
        {
            message: "Please select a weekday for weekly tasks",
            path: ["frequencyCondition"],
        }
    )
    .refine(
        (data) => {
            if (data.frequency === "Monthly") {
                return (
                    data.frequencyCondition !== undefined &&
                    data.frequencyCondition !== null &&
                    data.frequencyCondition >= 1 &&
                    data.frequencyCondition <= 30
                );
            }
            return true;
        },
        {
            message: "Please select a day of month for monthly tasks",
            path: ["frequencyCondition"],
        }
    );

export type ChecklistFormData = z.infer<typeof checklistFormSchema>;

interface User {
    id: number;
    name: string;
    email?: string;
}

interface ChecklistFormProps {
    initialData?: Checklist | null;
    users: User[];
    usersLoading?: boolean;
    isSubmitting: boolean;
    onSubmit: (data: ChecklistFormData) => void;
    onCancel: () => void;
    mode: "create" | "edit";
}

const ChecklistForm: React.FC<ChecklistFormProps> = ({
    initialData,
    users,
    usersLoading = false,
    isSubmitting,
    onSubmit,
    onCancel,
    mode,
}) => {
    const {
        register,
        handleSubmit,
        control,
        watch,
        setValue,
        formState: { errors },
    } = useForm<ChecklistFormData>({
        resolver: zodResolver(checklistFormSchema),
        defaultValues: {
            taskName: initialData?.taskName || "",
            description: initialData?.description || "",
            frequency: (initialData?.frequency as any) || undefined,
            frequencyCondition: initialData?.frequencyCondition ?? null,
            responsibility: initialData?.responsibility || "",
            accountability: initialData?.accountability || "",
        },
    });

    const selectedFrequency = watch("frequency");

    // Reset frequency condition when frequency changes
    useEffect(() => {
        if (selectedFrequency === "Daily" || selectedFrequency === "Quarterly" || selectedFrequency === "Annual") {
            setValue("frequencyCondition", null);
        }
    }, [selectedFrequency, setValue]);

    // Generate monthly days options (1-30)
    const monthlyDays = Array.from({ length: 30 }, (_, i) => i + 1);

    return (
        <Card>
            <CardHeader>
                <CardTitle>{mode === "create" ? "Create New Checklist" : "Edit Checklist"}</CardTitle>
                <CardDescription>
                    {mode === "create"
                        ? "Fill in the details below to create a new checklist task"
                        : "Update the checklist task details"}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Task Name */}
                    <div className="space-y-2">
                        <Label htmlFor="taskName">
                            Task Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="taskName"
                            placeholder="Enter task name"
                            {...register("taskName")}
                            disabled={isSubmitting}
                            className={errors.taskName ? "border-red-500" : ""}
                        />
                        {errors.taskName && (
                            <p className="text-sm text-red-500">{errors.taskName.message}</p>
                        )}
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description">Task Description</Label>
                        <Textarea
                            id="description"
                            placeholder="Enter task description (optional)"
                            rows={3}
                            {...register("description")}
                            disabled={isSubmitting}
                            className={errors.description ? "border-red-500" : ""}
                        />
                        {errors.description && (
                            <p className="text-sm text-red-500">{errors.description.message}</p>
                        )}
                    </div>

                    {/* Row: Frequency, Responsibility, Accountability */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Frequency */}
                        <div className="space-y-2">
                            <Label>
                                Frequency <span className="text-red-500">*</span>
                            </Label>
                            <Controller
                                name="frequency"
                                control={control}
                                render={({ field }) => (
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        disabled={isSubmitting}
                                    >
                                        <SelectTrigger className={errors.frequency ? "border-red-500" : ""}>
                                            <SelectValue placeholder="Choose Frequency" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {FREQUENCY_OPTIONS.map((freq) => (
                                                <SelectItem key={freq} value={freq}>
                                                    {freq}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {errors.frequency && (
                                <p className="text-sm text-red-500">{errors.frequency.message}</p>
                            )}
                        </div>

                        {/* Responsibility */}
                        <div className="space-y-2">
                            <Label>
                                Responsibility <span className="text-red-500">*</span>
                            </Label>
                            <Controller
                                name="responsibility"
                                control={control}
                                render={({ field }) => (
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        disabled={isSubmitting || usersLoading}
                                    >
                                        <SelectTrigger className={errors.responsibility ? "border-red-500" : ""}>
                                            <SelectValue
                                                placeholder={usersLoading ? "Loading users..." : "Select Responsible User"}
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {users.map((user) => (
                                                <SelectItem key={user.id} value={String(user.id)}>
                                                    {user.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {errors.responsibility && (
                                <p className="text-sm text-red-500">{errors.responsibility.message}</p>
                            )}
                        </div>

                        {/* Accountability */}
                        <div className="space-y-2">
                            <Label>
                                Accountability <span className="text-red-500">*</span>
                            </Label>
                            <Controller
                                name="accountability"
                                control={control}
                                render={({ field }) => (
                                    <Select
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        disabled={isSubmitting || usersLoading}
                                    >
                                        <SelectTrigger className={errors.accountability ? "border-red-500" : ""}>
                                            <SelectValue
                                                placeholder={usersLoading ? "Loading users..." : "Select Accountable User"}
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {users.map((user) => (
                                                <SelectItem key={user.id} value={String(user.id)}>
                                                    {user.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {errors.accountability && (
                                <p className="text-sm text-red-500">{errors.accountability.message}</p>
                            )}
                        </div>
                    </div>

                    {/* Conditional Frequency Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Weekly - Weekday Selection */}
                        {selectedFrequency === "Weekly" && (
                            <div className="space-y-2">
                                <Label>
                                    Select Weekday <span className="text-red-500">*</span>
                                </Label>
                                <Controller
                                    name="frequencyCondition"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            onValueChange={(val) => field.onChange(parseInt(val))}
                                            value={field.value?.toString() ?? ""}
                                            disabled={isSubmitting}
                                        >
                                            <SelectTrigger className={errors.frequencyCondition ? "border-red-500" : ""}>
                                                <SelectValue placeholder="Select Weekday" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {WEEKDAYS.map((day) => (
                                                    <SelectItem key={day.value} value={String(day.value)}>
                                                        {day.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {errors.frequencyCondition && (
                                    <p className="text-sm text-red-500">{errors.frequencyCondition.message}</p>
                                )}
                            </div>
                        )}

                        {/* Monthly - Day of Month Selection */}
                        {selectedFrequency === "Monthly" && (
                            <div className="space-y-2">
                                <Label>
                                    Day of Month <span className="text-red-500">*</span>
                                </Label>
                                <Controller
                                    name="frequencyCondition"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            onValueChange={(val) => field.onChange(parseInt(val))}
                                            value={field.value?.toString() ?? ""}
                                            disabled={isSubmitting}
                                        >
                                            <SelectTrigger className={errors.frequencyCondition ? "border-red-500" : ""}>
                                                <SelectValue placeholder="Select Day" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {monthlyDays.map((day) => (
                                                    <SelectItem key={day} value={String(day)}>
                                                        {day}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {errors.frequencyCondition && (
                                    <p className="text-sm text-red-500">{errors.frequencyCondition.message}</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Form Actions */}
                    <div className="flex justify-end gap-4 pt-4 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCancel}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting} className="min-w-32">
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {mode === "create" ? "Creating..." : "Updating..."}
                                </>
                            ) : mode === "create" ? (
                                "Save Task"
                            ) : (
                                "Update Checklist"
                            )}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
};

export default ChecklistForm;