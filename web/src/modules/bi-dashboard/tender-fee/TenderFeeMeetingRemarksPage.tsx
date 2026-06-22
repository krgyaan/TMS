import { useParams, useNavigate } from 'react-router-dom';
import { usePaymentRequest } from '@/hooks/api/usePaymentRequests';
import { formatINR } from '@/hooks/useINRFormatter';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import EmdMeetingForm from '../EmdMeetingForm';

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const TenderFeeMeetingRemarksPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const paymentRequestId = Number(id);
  const { data, isLoading, error } = usePaymentRequest(paymentRequestId);

  if (isLoading) return <Skeleton className="h-[400px]" />;
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
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

  const inst = data.instruments?.[0];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tender Fee — Meeting Remarks</CardTitle>
          <CardAction>
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="p-4 border rounded-lg flex-1 min-w-[250px] space-y-1">
              <p><b>Tender/WO No.:</b> {data.tenderNo}</p>
              <p><b>Project Name:</b> {data.projectName}</p>
              <p><b>Amount:</b> {formatINR(data.amountRequired)}</p>
              <p><b>Requested By:</b> {data.requestedByName || 'N/A'}</p>
              <p><b>Requested on:</b> {formatDate(data.createdAt)}</p>
            </div>
            <div className="p-4 border rounded-lg flex-1 min-w-[250px] space-y-1">
              <p><b>Mode:</b> {inst?.instrumentType || 'N/A'}</p>
              <p><b>Amount:</b> {inst?.amount ? formatINR(inst.amount) : 'N/A'}</p>
              <p><b>Status:</b> {inst?.status || data.status}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <EmdMeetingForm requestId={paymentRequestId} />
    </div>
  );
};

export default TenderFeeMeetingRemarksPage;
