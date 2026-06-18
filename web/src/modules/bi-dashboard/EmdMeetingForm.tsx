import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { usePaymentRequest, useMomRemarks, useAddMomRemark } from "@/hooks/api/usePaymentRequests";
import { formatINR } from "@/hooks/useINRFormatter";
import type { MomRemark } from "@/modules/tendering/emds-tenderfees/helpers/payment-request.types";
import { AlertCircle, ArrowLeft, Send, User, Calendar } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

const EmdMeetingForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const paymentRequestId = Number(id);

  const { data, isLoading, error } = usePaymentRequest(paymentRequestId);
  const { data: remarks, isLoading: remarksLoading } = useMomRemarks(paymentRequestId);
  const addRemark = useAddMomRemark();

  const [newRemark, setNewRemark] = useState('');

  const handleSubmit = () => {
    if (!newRemark.trim()) return;
    addRemark.mutate(
      { requestId: paymentRequestId, data: { remark: newRemark.trim() } },
      { onSuccess: () => setNewRemark('') }
    );
  };

  if (isLoading) return <Skeleton className="h-[600px]" />;

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{error.name}</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Not Found</AlertTitle>
        <AlertDescription>Payment request not found.</AlertDescription>
      </Alert>
    );
  }

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const instrument = data.instruments?.[0];
  const utr = instrument?.details?.utrNum || instrument?.details?.utr || 'N/A';

  return (
    <Card>
      <CardHeader>
        <CardTitle>EMD Meeting Remarks</CardTitle>
        <CardAction>
          <Button variant='outline' onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="p-4 space-y-1 border rounded-lg flex-1 min-w-[250px]">
            <p><b>Tender/WO No.:</b> {data.tenderNo}</p>
            <p><b>Project Name:</b> {data.projectName}</p>
            <p><b>Amount:</b> {formatINR(data.amountRequired)}</p>
            <p><b>Requested By:</b> {data.requestedByName || 'N/A'}</p>
            <p><b>Requested on:</b> {formatDate(data.createdAt)}</p>
          </div>
          <div className="p-4 space-y-1 border rounded-lg flex-1 min-w-[250px]">
            <p><b>Mode:</b> {instrument?.instrumentType || 'N/A'}</p>
            <p><b>UTR/Ref:</b> {utr}</p>
            <p><b>Status:</b> {instrument?.status || data.status}</p>
            <p><b>Purpose:</b> {data.purpose}</p>
          </div>
        </div>

        <div className="my-6">
          <h3 className="text-lg font-semibold mb-3">Meeting Remarks</h3>

          {remarksLoading ? (
            <Skeleton className="h-32" />
          ) : remarks && remarks.length > 0 ? (
            <div className="space-y-3">
              {remarks.map((remark: MomRemark) => (
                <div key={remark.id} className="border rounded-md p-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <User className="h-3.5 w-3.5" />
                    <span className="font-medium text-foreground">{remark.addedByName}</span>
                    <Calendar className="h-3.5 w-3.5 ml-2" />
                    <span>{formatDate(remark.createdAt)}</span>
                    {remark.instrumentId && (
                      <span className="text-xs bg-primary/10 px-2 py-0.5 rounded">
                        Instrument #{remark.instrumentId}
                      </span>
                    )}
                  </div>
                  <p className="text-sm">{remark.remark}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No remarks added yet.</p>
          )}

          <div className="mt-4 flex gap-2">
            <Textarea
              placeholder="Add a remark..."
              value={newRemark}
              onChange={(e) => setNewRemark(e.target.value)}
              className="flex-1"
              rows={2}
            />
            <Button
              onClick={handleSubmit}
              disabled={!newRemark.trim() || addRemark.isPending}
              className="self-end"
            >
              <Send className="h-4 w-4 mr-1" />
              {addRemark.isPending ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmdMeetingForm;
