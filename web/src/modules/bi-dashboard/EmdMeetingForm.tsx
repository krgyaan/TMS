import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAddMomRemark, useMomRemarks } from "@/hooks/api/usePaymentRequests";
import type { MomRemark } from "@/modules/tendering/emds-tenderfees/helpers/payment-request.types";
import { CornerDownRight, Send } from "lucide-react";
import { useState } from 'react';

interface EmdMeetingFormProps {
  requestId: number;
}

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const EmdMeetingForm = ({ requestId }: EmdMeetingFormProps) => {
  const { data: remarks, isLoading } = useMomRemarks(requestId);
  const addRemark = useAddMomRemark();
  const [newRemark, setNewRemark] = useState('');

  const handleSubmit = () => {
    if (!newRemark.trim()) return;
    addRemark.mutate(
      { requestId, data: { remark: newRemark.trim() } },
      { onSuccess: () => setNewRemark('') }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meeting Remarks</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32" />
        ) : remarks && remarks.length > 0 ? (
          <div className="space-y-3 mb-4">
            {remarks.map((remark: MomRemark) => (
              <div key={remark.id} className="flex flex-col">
                <p className="text-sm bg-accent p-2 rounded-md">{remark.remark}</p>
                <p className="flex text-xs text-right">
                  <CornerDownRight className="mr-2 h-4 w-4" />
                  <span>{remark.addedByName}</span>
                  <span className="px-1">/</span>
                  <span>{formatDate(remark.createdAt)}</span>
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mb-4">No remarks added yet.</p>
        )}

        <div className="flex gap-2">
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
      </CardContent>
    </Card>
  );
};

export default EmdMeetingForm;
