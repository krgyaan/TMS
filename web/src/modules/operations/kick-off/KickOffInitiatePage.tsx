// src/pages/kick-off-meeting/InitiateMeetingPage.tsx

import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { ArrowLeft, Loader2, Plus, Trash2, Users, Calendar, Video, ExternalLink, Info, Link2 } from "lucide-react";

/* ================================
   TYPES
================================ */
interface ContactRow {
    id: string;
    organization: string;
    department: string;
    name: string;
    designation: string;
    phone: string;
    email: string;
}

interface MeetingData {
    id: number;
    meeting_date_time: string;
    google_meet_link: string;
}

/* ================================
   DUMMY DATA
================================ */
const DUMMY_WO_DATA = {
    id: 1,
    tender_name: "Smart City Infrastructure Development - Phase 1",
    wo_number: "WO/2024/SC/001",
};

const DUMMY_CONTACTS: ContactRow[] = [
    {
        id: "1",
        organization: "Municipal Corporation of Delhi",
        department: "EIC",
        name: "Rajesh Kumar",
        designation: "Chief Engineer",
        phone: "9876543210",
        email: "rajesh.kumar@mcd.gov.in",
    },
    {
        id: "2",
        organization: "Municipal Corporation of Delhi",
        department: "User",
        name: "Priya Sharma",
        designation: "Project Manager",
        phone: "9876543211",
        email: "priya.sharma@mcd.gov.in",
    },
];

const DUMMY_MEETING: MeetingData = {
    id: 1,
    meeting_date_time: "",
    google_meet_link: "",
};

const DEPARTMENTS = [
    { value: "EIC", label: "EIC" },
    { value: "User", label: "User" },
    { value: "C&P", label: "C&P" },
    { value: "Finance", label: "Finance" },
];

/* ================================
   HELPERS
================================ */
const generateId = () => `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const createEmptyContact = (): ContactRow => ({
    id: generateId(),
    organization: "",
    department: "",
    name: "",
    designation: "",
    phone: "",
    email: "",
});

/* ================================
   MAIN COMPONENT
================================ */
const KickOffInitiatePage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();

    /* ================================
       STATE
    ================================ */
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Contacts
    const [contacts, setContacts] = useState<ContactRow[]>(DUMMY_CONTACTS.length > 0 ? DUMMY_CONTACTS : [createEmptyContact()]);

    // Meeting Details
    const [meetingDateTime, setMeetingDateTime] = useState(DUMMY_MEETING.meeting_date_time);
    const [googleMeetLink, setGoogleMeetLink] = useState(DUMMY_MEETING.google_meet_link);

    /* ================================
       HANDLERS - CONTACTS
    ================================ */
    const addContact = () => {
        setContacts([...contacts, createEmptyContact()]);
    };

    const removeContact = (id: string) => {
        if (contacts.length > 1) {
            setContacts(contacts.filter(c => c.id !== id));
        }
    };

    const updateContact = (id: string, field: keyof ContactRow, value: string) => {
        setContacts(contacts.map(c => (c.id === id ? { ...c, [field]: value } : c)));
    };

    /* ================================
       HANDLERS - FORM
    ================================ */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const formData = {
            id: DUMMY_WO_DATA.id,
            contacts,
            meeting_date_time: meetingDateTime,
            google_meet_link: googleMeetLink,
        };

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));

        console.log("Form Data:", formData);

        setIsSubmitting(false);
    };

    /* ================================
       RENDER
    ================================ */
    return (
        <div className="min-h-screen bg-background py-6">
            <div className="container mx-auto px-4">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-semibold">Initiate Kick Off Meeting</h1>
                        <p className="text-sm text-muted-foreground">{DUMMY_WO_DATA.tender_name}</p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Attendees Section */}
                    <Card>
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <Users className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base">Meeting Attendees</CardTitle>
                                        <CardDescription>Add client representatives for the kick-off meeting</CardDescription>
                                    </div>
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={addContact}>
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add
                                </Button>
                            </div>
                        </CardHeader>

                        <CardContent className="p-0">
                            <div className="border-t">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead>Organization</TableHead>
                                            <TableHead>Department</TableHead>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Designation</TableHead>
                                            <TableHead>Phone</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead className="w-10"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {contacts.map(contact => (
                                            <TableRow key={contact.id}>
                                                <TableCell className="p-2">
                                                    <Input
                                                        value={contact.organization}
                                                        onChange={e => updateContact(contact.id, "organization", e.target.value)}
                                                        placeholder="Organization"
                                                        className="h-9"
                                                        required
                                                    />
                                                </TableCell>
                                                <TableCell className="p-2">
                                                    <Select value={contact.department} onValueChange={v => updateContact(contact.id, "department", v)}>
                                                        <SelectTrigger className="h-9">
                                                            <SelectValue placeholder="Select" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {DEPARTMENTS.map(dept => (
                                                                <SelectItem key={dept.value} value={dept.value}>
                                                                    {dept.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell className="p-2">
                                                    <Input
                                                        value={contact.name}
                                                        onChange={e => updateContact(contact.id, "name", e.target.value)}
                                                        placeholder="Name"
                                                        className="h-9"
                                                        required
                                                    />
                                                </TableCell>
                                                <TableCell className="p-2">
                                                    <Input
                                                        value={contact.designation}
                                                        onChange={e => updateContact(contact.id, "designation", e.target.value)}
                                                        placeholder="Designation"
                                                        className="h-9"
                                                        required
                                                    />
                                                </TableCell>
                                                <TableCell className="p-2">
                                                    <Input
                                                        type="tel"
                                                        value={contact.phone}
                                                        onChange={e => updateContact(contact.id, "phone", e.target.value)}
                                                        placeholder="Phone"
                                                        className="h-9"
                                                        maxLength={10}
                                                        required
                                                    />
                                                </TableCell>
                                                <TableCell className="p-2">
                                                    <Input
                                                        type="email"
                                                        value={contact.email}
                                                        onChange={e => updateContact(contact.id, "email", e.target.value)}
                                                        placeholder="Email"
                                                        className="h-9"
                                                        required
                                                    />
                                                </TableCell>
                                                <TableCell className="p-2">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                        onClick={() => removeContact(contact.id)}
                                                        disabled={contacts.length === 1}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Meeting Details Section */}
                    <Card>
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Video className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-base">Meeting Details</CardTitle>
                                    <CardDescription>Schedule the kick-off meeting date and setup video call</CardDescription>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Date & Time */}
                                <div className="space-y-2">
                                    <Label htmlFor="meeting_date_time" className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        Meeting Date & Time
                                        <span className="text-destructive">*</span>
                                    </Label>
                                    <Input id="meeting_date_time" type="datetime-local" value={meetingDateTime} onChange={e => setMeetingDateTime(e.target.value)} required />
                                </div>

                                {/* Google Meet Link */}
                                <div className="space-y-2">
                                    <Label htmlFor="google_meet_link" className="flex items-center gap-2">
                                        <Link2 className="h-4 w-4 text-muted-foreground" />
                                        Google Meet Link
                                        <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="google_meet_link"
                                        type="url"
                                        value={googleMeetLink}
                                        onChange={e => setGoogleMeetLink(e.target.value)}
                                        placeholder="https://meet.google.com/xxx-xxxx-xxx"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Helper Alert */}
                            <Alert className="bg-muted/50 border-muted">
                                <Info className="h-4 w-4" />
                                <AlertDescription className="flex items-center gap-1">
                                    Need to create a meeting? Visit
                                    <a
                                        href="https://meet.google.com/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-primary font-medium hover:underline"
                                    >
                                        Google Meet
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                    to schedule one.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {isSubmitting ? "Saving..." : "Schedule Meeting"}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default KickOffInitiatePage;
