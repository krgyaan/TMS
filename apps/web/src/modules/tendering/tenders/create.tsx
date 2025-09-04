import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { zodResolver } from "@hookform/resolvers/zod"
import { type SubmitHandler, useForm } from "react-hook-form"
import { z } from "zod"
import { Form } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { FieldWrapper } from "@/components/form/FieldWrapper"
import { NumberInput } from "@/components/form/NumberInput"
import { SelectField } from "@/components/form/SelectField"
import { DateTimeInput } from "@/components/form/DateTimeInput"

// Placeholder option lists for selects
const organizations = [
    { id: "org-1", name: "Select Organization" },
    { id: "org-2", name: "Select Organization One" },
    { id: "org-3", name: "Select Organization Two" },
]
const users = [
    { id: "", name: "Select User" },
    { id: "user-1", name: "Alice" },
    { id: "user-2", name: "Bob" },
]
const locations = [
    { id: "", name: "Select Location" },
    { id: "loc-1", name: "New York" },
    { id: "loc-2", name: "Mumbai" },
]
const websites = [
    { id: "", name: "Select Website" },
    { id: "web-1", name: "example.com" },
    { id: "web-2", name: "gov.in" },
]
const items = [
    { id: "", name: "Select Item Name" },
    { id: "item-1", name: "Cement" },
    { id: "item-2", name: "Steel" },
]

// Zod Schema for form validation
const formSchema = z.object({
    teamName: z.string().min(1, { message: "Team Name is required" }),
    tenderNo: z.string().min(1, { message: "Tender No is required" }),
    tenderName: z.string().min(1, { message: "Tender Name is required" }),
    organization: z.string().min(1, { message: "Select an organization" }),
    tenderValue: z.number().nonnegative({ message: "Enter a valid amount" }),
    tenderFee: z.number().min(0, { message: "Enter a valid amount" }),
    emd: z.number().min(0, { message: "Enter a valid amount" }),
    teamMember: z.string().min(1, { message: "Select a team member" }),
    dueDateTime: z.string().min(1, { message: "Due date and time is required" }),
    location: z.string().min(1, { message: "Select a location" }),
    website: z.string().min(1, { message: "Select a website" }),
    item: z.string().min(1, { message: "Select an item" }),
    documents: z.any().optional(),
    remarks: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>


const create = () => {
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            teamName: "",
            tenderNo: "",
            tenderName: "",
            organization: "",
            tenderValue: 0,
            tenderFee: 0,
            emd: 0,
            teamMember: "",
            dueDateTime: "",
            location: "",
            website: "",
            item: "",
            documents: undefined,
            remarks: "",
        },
    })

    const onSubmit: SubmitHandler<FormValues> = (values) => {
        const docs = values.documents as FileList | undefined
        const fileNames = docs ? Array.from(docs).map((f) => f.name) : []
        console.log({ ...values, documents: fileNames })
    }

    return (
        <Card className="">
            <CardHeader>
                <CardTitle>
                    Create Tender
                </CardTitle>
                <CardAction>
                    <Button variant={"outline"}>
                        Return Back
                    </Button>
                </CardAction>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <FieldWrapper<FormValues, "teamName"> control={form.control} name="teamName" label={"Team Name: AC/DC"}>
                                {(field) => <Input placeholder="AC/DC" {...field} />}
                            </FieldWrapper>

                            <FieldWrapper<FormValues, "tenderNo"> control={form.control} name="tenderNo" label={"Tender No"}>
                                {(field) => <Input placeholder="Tender No" {...field} />}
                            </FieldWrapper>

                            <FieldWrapper<FormValues, "tenderName"> control={form.control} name="tenderName" label={"Tender Name"}>
                                {(field) => <Input placeholder="Tender Name" {...field} />}
                            </FieldWrapper>

                            <SelectField<FormValues, "organization">
                                control={form.control}
                                name="organization"
                                label="Organization"
                                options={organizations.filter((o) => o.id !== "org-1")}
                                placeholder="Select Organization"
                            />

                            <FieldWrapper<FormValues, "tenderValue"> control={form.control} name="tenderValue" label={"Tender Value (GST Inclusive) "}>
                                {(field) => (
                                    <NumberInput step={0.01} placeholder="Amount" value={field.value} onChange={field.onChange} />
                                )}
                            </FieldWrapper>

                            <FieldWrapper<FormValues, "tenderFee"> control={form.control} name="tenderFee" label={"Tender Fee"}>
                                {(field) => (
                                    <NumberInput step={0.01} placeholder="Amount" value={field.value} onChange={field.onChange} />
                                )}
                            </FieldWrapper>

                            <FieldWrapper<FormValues, "emd"> control={form.control} name="emd" label={"EMD"}>
                                {(field) => (
                                    <NumberInput step={0.01} placeholder="Amount" value={field.value} onChange={field.onChange} />
                                )}
                            </FieldWrapper>

                            <SelectField<FormValues, "teamMember">
                                control={form.control}
                                name="teamMember"
                                label="Team Member"
                                options={users.filter((u) => u.id)}
                                placeholder="Select User"
                            />

                            <FieldWrapper<FormValues, "dueDateTime">
                                control={form.control}
                                name="dueDateTime"
                                label={"Due Date and Time"}
                            >
                                {(field) => (
                                    <DateTimeInput
                                        value={field.value}
                                        onChange={field.onChange}
                                        className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                                    />
                                )}
                            </FieldWrapper>

                            <SelectField<FormValues, "location">
                                control={form.control}
                                name="location"
                                label="Location"
                                options={locations.filter((l) => l.id)}
                                placeholder="Select Location"
                            />

                            <SelectField<FormValues, "website">
                                control={form.control}
                                name="website"
                                label="Website"
                                options={websites.filter((w) => w.id)}
                                placeholder="Select Website"
                            />

                            <SelectField<FormValues, "item">
                                control={form.control}
                                name="item"
                                label="Item"
                                options={items.filter((i) => i.id)}
                                placeholder="Select Item Name"
                            />

                            <FieldWrapper<FormValues, "documents">
                                control={form.control}
                                name="documents"
                                label="Upload Documents"
                                description="Upload relevant tender documents (optional)"
                              >
                                {(field) => (
                                  <Input type="file" multiple onChange={(e) => field.onChange(e.target.files)} />
                                )}
                            </FieldWrapper>

                            <FieldWrapper<FormValues, "remarks">
                                control={form.control}
                                name="remarks"
                                label="Remarks"
                                className="md:col-span-2"
                              >
                                {(field) => (
                                  <textarea
                                    className="border-input placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                    placeholder="Remarks"
                                    {...field}
                                  />
                                )}
                            </FieldWrapper>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button type="submit">Submit</Button>
                            <Button type="button" variant="outline" onClick={() => form.reset()}>
                                Reset
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
};

export default create
