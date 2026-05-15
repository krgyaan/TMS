interface EmailTemplateData {
    tenderNo?: string | null;
    projectName?: string | null;
    status?: string | null;
    amount?: string | number | null;
    date?: string | null;
    utr?: string | null;
    utrNo?: string | null;
    ddNo?: string | null;
    fdrNo?: string | null;
    expiryDate?: string | null;
    transactionDate?: string | null;
    accountNo?: string | null;
    ifsc?: string | null;
    name?: string;
}

const formatVal = (v: string | number | null | undefined) => v != null ? String(v) : "";

export function buildEmailTemplate(instrumentType: string, data: EmailTemplateData): string {
    const n = "Sir/Madam";
    const projectName = formatVal(data.projectName || data.tenderNo || "N/A");
    const amount = formatVal(data.amount);
    const tenderNo = formatVal(data.tenderNo);
    const status = formatVal(data.status);
    const date = formatVal(data.date || data.transactionDate);
    const utr = formatVal(data.utr || data.utrNo);
    const ddNo = formatVal(data.ddNo);
    const fdrNo = formatVal(data.fdrNo);
    const expiryDate = formatVal(data.expiryDate);

    switch (instrumentType) {
        case 'Bank Transfer':
            return `<!DOCTYPE html>
<html><body>
<div>
    <p>Dear ${n},</p>
    <p>The status of the Tender no. ${tenderNo}, tender name ${projectName}, is ${status}. Please initiate the process of releasing the EMD, Rs. ${amount} submitted against the tender. The details of the EMD submitted are as follows:</p>
    <ul>
        <li>Date: ${date}</li>
        <li>UTR no.: ${utr}</li>
        <li>Amount: Rs. ${amount}</li>
    </ul>
    <p>Please transfer the amount to the below-mentioned account details:</p>
    <ul>
        <li>Account Name: Volks Energie Pvt. Ltd.</li>
        <li>Account No.: 003084600002011</li>
        <li>IFSC Code: YESB0000030</li>
    </ul>
    <p>Also please find the Cancelled cheque and the bank-approved mandate form as reference.</p>
    <p>Best Regards,<br />Accounts team,<br />Volks Energie Pvt. Ltd</p>
</div>
</body></html>`;

        case 'Portal Payment':
            return `<!DOCTYPE html>
<html><body>
<div>
    <p>Dear ${n},</p>
    <p>The status of the Tender no. ${tenderNo}, project name ${projectName}, is ${status}. Please initiate the process of releasing the EMD, Rs. ${amount} submitted against the tender.</p>
    <p>The details of the EMD submitted are as follows:</p>
    <ul>
        <li>Date: ${date}</li>
        <li>UTR no.: ${utr}</li>
        <li>Amount: Rs. ${amount}</li>
    </ul>
    <p>Please transfer the amount to the below-mentioned account details:</p>
    <ul>
        <li>Account no.: Volks Energie Pvt. Ltd.</li>
        <li>Account No: ${formatVal(data.accountNo || "003084600002011")}</li>
        <li>IFSC Code: ${formatVal(data.ifsc || "YESB0000030")}</li>
    </ul>
    <p>Also please find the Cancelled cheque and the bank-approved mandate form as reference.</p>
    <p>Best Regards,<br />Accounts team,<br />Volks Energie Pvt. Ltd.</p>
</div>
</body></html>`;

        case 'DD':
            return `<!DOCTYPE html>
<html><body>
<div>
    <p>Dear ${n},</p>
    <p>The status of the Tender no. ${tenderNo}, project name ${projectName}, is ${status}. Please initiate the process of releasing the EMD, Rs. ${amount} submitted against the tender. The details of the EMD submitted are as follows:</p>
    <ul>
        <li>Date: ${date}</li>
        <li>DD no.: ${ddNo}</li>
        <li>Amount: Rs. ${amount}</li>
    </ul>
    <p>Please transfer the amount to the below-mentioned account details:</p>
    <ul>
        <li>Account Name: Volks Energie Pvt. Ltd.</li>
        <li>Account No.: 003084600002011</li>
        <li>IFSC Code: YESB0000030</li>
    </ul>
    <p>Also please find the Cancelled cheque and the bank-approved mandate form as reference.</p>
    <p>Else, please courier the DD back to our address mentioned below:</p>
    <p>Volks Energie Pvt. Ltd.<br />
        B1/D8, 2nd Floor,<br />
        Mohan Cooperative Industrial Estate,<br />
        New Delhi - 110044<br />
        Phone no.: +91-8882591733
    </p>
    <p>In case of a courier, please reply to this mail with the Courier Docket Number and the Courier Docket Slip so that we can effectively track the envelope and ensure it is not lost in transit.</p>
    <p>Best Regards,<br />Accounts team,<br />Volks Energie Pvt. Ltd.</p>
</div>
</body></html>`;

        case 'FDR':
            return `<!DOCTYPE html>
<html><body>
<div>
    <p>Dear ${n},</p>
    <p>${status ? `The FDR submitted against Wo no. ${tenderNo}, Project name ${projectName}, has expired.` : `The status of the Tender no. ${tenderNo}, project name ${projectName}, is ${status}.`}
    </p>
    <p>Please initiate the process of releasing the EMD in the form of FDR for Rs. ${amount} submitted against the tender.</p>
    <p>The details of the EMD in the form of FDR submitted are as follows:</p>
    <ul>
        <li>FDR no.: ${fdrNo}</li>
        <li>FDR Date: ${date}</li>
        <li>FDR Expiry Date: ${expiryDate}</li>
        <li>Amount: Rs. ${amount}</li>
    </ul>
    <p>Please courier the FDR back to our address mentioned below:</p>
    <p>
        Volks Energie Pvt. Ltd.<br />
        B1/D8, 2nd Floor,<br />
        Mohan Cooperative Industrial Estate,<br />
        New Delhi - 110044<br />
        Phone no.: +91-8882591733
    </p>
    <p>Please reply to this mail with the Courier Docket Number and the Courier Docket Slip so that we can effectively track the envelope and ensure its preservation in transit.</p>
    <p>Best Regards,<br />Accounts team,<br />Volks Energie Pvt. Ltd.</p>
</div>
</body></html>`;

        default:
            return `<p>No email template available for ${instrumentType}.</p>`;
    }
}
