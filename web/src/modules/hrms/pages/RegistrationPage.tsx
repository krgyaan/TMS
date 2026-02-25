import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RegistrationForm } from "../components/RegistrationForm";

export default function RegistrationPage() {
    const navigate = useNavigate();

    return (
        <div className="container mx-auto py-8">
            <Card>
                <CardHeader>
                    <CardTitle>Employee Registration</CardTitle>
                    <CardDescription>Complete your profile to activate your account</CardDescription>
                    <CardAction>
                        <Button variant="outline" onClick={() => navigate("/")}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Home
                        </Button>
                    </CardAction>
                </CardHeader>
                <CardContent>
                    <RegistrationForm />
                </CardContent>
            </Card>
        </div>
    );
}
