import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const ImprestVoucherProofPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const { proofs, beneficiaryName, period } = location.state || {};
    const [preview, setPreview] = React.useState<any>(null);

    if (!location.state) {
        return (
            <div className="p-6">
                <div className="mb-4 text-red-600 font-semibold">Proofs cannot be opened directly.</div>
                <Button variant="outline" onClick={() => navigate(-1)}>
                    Go Back
                </Button>
            </div>
        );
    }

    if (!Array.isArray(proofs) || proofs.length === 0) {
        return <div className="p-6">No proof found</div>;
    }

    return (
        <div className="p-6">
            <div className="mb-4">
                <div className="font-semibold">{beneficiaryName}</div>
                {period && (
                    <div className="text-sm text-muted-foreground">
                        {new Date(period.from).toLocaleDateString("en-GB")} – {new Date(period.to).toLocaleDateString("en-GB")}
                    </div>
                )}
            </div>

            <div className="flex gap-2 flex-wrap mb-4">
                {proofs.map((proof: any) => (
                    <Button key={proof.id} size="sm" variant="outline" onClick={() => setPreview(proof)}>
                        {proof.type === "pdf" ? `PDF-${proof.id}` : `Image-${proof.id}`}
                    </Button>
                ))}
            </div>

            <div>
                {preview?.type === "pdf" && <iframe src={preview.url} width="100%" height="500px" title="PDF Preview" />}

                {preview?.type === "image" && <img src={preview.url} alt="Voucher Proof" className="max-w-full mx-auto" />}
            </div>
        </div>
    );
};

export default ImprestVoucherProofPage;
