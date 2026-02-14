import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";

import { getImprestVoucherProofs } from "./imprest.api";
import { Button } from "@/components/ui/button";

const ImprestVoucherProofs: React.FC = () => {
    const [searchParams] = useSearchParams();

    const userIdParam = searchParams.get("userId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const userId = userIdParam ? Number(userIdParam) : null;

    const [preview, setPreview] = React.useState<any>(null);

    const { data, isLoading } = useQuery({
        queryKey: ["voucher-proofs", userId, from, to],
        queryFn: () =>
            getImprestVoucherProofs({
                userId: userId as number,
                from: from as string,
                to: to as string,
            }),
        enabled: Boolean(userId && from && to),
    });

    if (!userId || !from || !to) {
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
