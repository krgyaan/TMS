import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

import { getImprestVoucherProofs } from "./imprest.api";
import { Button } from "@/components/ui/button";

const ImprestVoucherProofs: React.FC = () => {
    const [searchParams] = useSearchParams();

    const userId = Number(searchParams.get("userId"));
    const year = Number(searchParams.get("year"));
    const week = Number(searchParams.get("week"));

    const [preview, setPreview] = React.useState<any>(null);

    const { data, isLoading } = useQuery({
        queryKey: ["voucher-proofs", userId, year, week],
        queryFn: () =>
            getImprestVoucherProofs({
                userId,
                year,
                week,
            }),
        enabled: Boolean(userId && year && week),
    });

    if (!userId || !year || !week) {
        return <div className="p-6">Invalid or missing query parameters</div>;
    }

    if (isLoading) {
        return <div className="p-6">Loading…</div>;
    }

    if (!data?.proofs?.length) {
        return <div className="p-6">No proof found</div>;
    }

    return (
        <div className="p-6">
            <div className="flex gap-2 flex-wrap mb-4">
                {data.proofs.map((proof: any) => (
                    <Button key={proof.id} size="sm" variant="outline" onClick={() => setPreview(proof)}>
                        {proof.type === "pdf" ? `PDF-${proof.id}` : `Image-${proof.id}`}
                    </Button>
                ))}
            </div>

            <div id="preview">
                {preview?.type === "pdf" && <iframe src={preview.url} width="100%" height="500px" title="PDF Preview" />}

                {preview?.type === "image" && <img src={preview.url} alt="Voucher Proof" className="max-w-full mx-auto" />}
            </div>

            {/* <Button className="mt-4" variant="outline" onClick={() => window.print()}>
                Print All Proofs
            </Button> */}
        </div>
    );
};

export default ImprestVoucherProofs;
