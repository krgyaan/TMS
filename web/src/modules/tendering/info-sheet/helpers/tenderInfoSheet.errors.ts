import { toast } from 'sonner';

/**
 * Maps form field paths to user-friendly labels
 */
const getFieldLabel = (fieldPath: string): string => {
    const fieldMap: Record<string, string> = {
        'teRecommendation': 'TE Recommendation',
        'teRejectionReason': 'TE Rejection Reason',
        'teRejectionRemarks': 'TE Rejection Remarks',
        'processingFeeRequired': 'Processing Fee Required',
        'processingFeeModes': 'Processing Fee Modes',
        'processingFeeAmount': 'Processing Fee Amount',
        'tenderFeeRequired': 'Tender Fee Required',
        'tenderFeeModes': 'Tender Fee Modes',
        'tenderFeeAmount': 'Tender Fee Amount',
        'emdRequired': 'EMD Required',
        'emdModes': 'EMD Modes',
        'emdAmount': 'EMD Amount',
        'tenderValueGstInclusive': 'Tender Value (GST Inclusive)',
        'bidValidityDays': 'Bid Validity Days',
        'commercialEvaluation': 'Commercial Evaluation',
        'mafRequired': 'MAF Required',
        'reverseAuctionApplicable': 'Reverse Auction Applicable',
        'paymentTermsSupply': 'Payment Terms (Supply)',
        'paymentTermsInstallation': 'Payment Terms (Installation)',
        'deliveryTimeSupply': 'Delivery Time (Supply)',
        'deliveryTimeInstallationInclusive': 'Delivery Time Installation Inclusive',
        'deliveryTimeInstallation': 'Delivery Time (Installation)',
        'pbgRequired': 'PBG Required',
        'pbgForm': 'PBG Mode',
        'pbgPercentage': 'PBG Percentage',
        'pbgDurationMonths': 'PBG Duration',
        'sdRequired': 'SD Required',
        'sdForm': 'SD Mode',
        'securityDepositPercentage': 'Security Deposit Percentage',
        'sdDurationMonths': 'SD Duration',
        'ldRequired': 'LD Required',
        'ldPercentagePerWeek': 'LD Percentage Per Week',
        'maxLdPercentage': 'Max LD Percentage',
        'physicalDocsRequired': 'Physical Docs Required',
        'physicalDocsDeadline': 'Physical Docs Deadline',
        'techEligibilityAgeYears': 'Technical Eligibility Age',
        'workValueType': 'Work Value Type',
        'orderValue1': 'Order Value 1',
        'orderValue2': 'Order Value 2',
        'orderValue3': 'Order Value 3',
        'customEligibilityCriteria': 'Custom Eligibility Criteria',
        'technicalWorkOrders': 'Technical Work Orders',
        'commercialDocuments': 'Commercial Documents',
        'avgAnnualTurnoverCriteria': 'Average Annual Turnover',
        'avgAnnualTurnoverValue': 'Average Annual Turnover Value',
        'workingCapitalCriteria': 'Working Capital',
        'workingCapitalValue': 'Working Capital Value',
        'solvencyCertificateCriteria': 'Solvency Certificate',
        'solvencyCertificateValue': 'Solvency Certificate Value',
        'netWorthCriteria': 'Net Worth',
        'netWorthValue': 'Net Worth Value',
        'clientOrganization': 'Client Organization',
        'clients': 'Client Details',
        'courierAddress': 'Courier Address',
        'teRemark': 'TE Final Remark',
    };

    // Handle nested fields like clients.0.clientName
    if (fieldPath.startsWith('clients.')) {
        const parts = fieldPath.split('.');
        const index = parts[1];
        const field = parts[2];
        const clientFieldMap: Record<string, string> = {
            'clientName': 'Client Name',
            'clientDesignation': 'Client Designation',
            'clientMobile': 'Client Mobile',
            'clientEmail': 'Client Email',
        };
        return `Client ${parseInt(index) + 1} - ${clientFieldMap[field] || field}`;
    }

    return fieldMap[fieldPath] || fieldPath;
};

/**
 * Recursively collects validation errors from react-hook-form error object
 */
const collectErrors = (
    obj: Record<string, unknown>,
    errorMessages: string[],
    prefix = ''
): void => {
    for (const [key, value] of Object.entries(obj)) {
        const fieldPath = prefix ? `${prefix}.${key}` : key;

        if (Array.isArray(value)) {
            // Handle array errors (like technicalWorkOrders, commercialDocuments)
            // Each array element is an error object
            value.forEach((item, index) => {
                if (item && typeof item === 'object' && !Array.isArray(item)) {
                    // Check if this array item has an error message
                    if ('message' in item && typeof item.message === 'string') {
                        const fieldLabel = getFieldLabel(fieldPath);
                        errorMessages.push(`${fieldLabel} (item ${index + 1}): ${item.message}`);
                    } else {
                        // Recursively process nested errors in the array item
                        collectErrors(item as Record<string, unknown>, errorMessages, `${fieldPath}.${index}`);
                    }
                }
            });
        } else if (value && typeof value === 'object') {
            // Check for error message first (handles both field errors and array-level errors)
            if ('message' in value && typeof value.message === 'string') {
                const fieldLabel = getFieldLabel(fieldPath);
                errorMessages.push(`${fieldLabel}: ${value.message}`);
            }

            // Process nested errors (like clients[0].clientName errors)
            // React Hook Form stores array item errors as numeric keys: { 0: {...}, 1: {...} }
            for (const [nestedKey, nestedValue] of Object.entries(value)) {
                // Skip message, type, and other non-error properties
                if (nestedKey === 'message' || nestedKey === 'type' || nestedKey === 'ref') {
                    continue;
                }

                if (nestedValue && typeof nestedValue === 'object' && !Array.isArray(nestedValue)) {
                    collectErrors({ [nestedKey]: nestedValue } as Record<string, unknown>, errorMessages, fieldPath);
                } else if (Array.isArray(nestedValue)) {
                    // Handle nested arrays
                    collectErrors({ [nestedKey]: nestedValue } as Record<string, unknown>, errorMessages, fieldPath);
                }
            }
        }
    }
};

/**
 * Handles form validation errors and displays user-friendly toast notifications
 * @param errors - React Hook Form errors object
 */
export const handleInfoSheetFormErrors = (errors: Record<string, unknown>): void => {
    // Log errors for debugging
    console.log('Form validation errors:', errors);

    const errorMessages: string[] = [];
    collectErrors(errors, errorMessages);

    console.log('Collected error messages:', errorMessages);

    if (errorMessages.length > 0) {
        // Show first 3 specific errors, then count if more
        const displayMessages = errorMessages.slice(0, 3);
        let message = 'Please fix the following errors:\n• ' + displayMessages.join('\n• ');

        if (errorMessages.length > 3) {
            message += `\n\n...and ${errorMessages.length - 3} more error${errorMessages.length - 3 > 1 ? 's' : ''}. Please check all fields marked in red.`;
        }

        toast.error(message, {
            duration: 5000,
        });
    } else {
        // Log when no errors are collected but errors object exists
        const hasErrors = Object.keys(errors).length > 0;
        if (hasErrors) {
            console.warn('Errors object exists but no messages were collected:', errors);
        }
        toast.error('Please check the form for validation errors before submitting.');
    }
};
