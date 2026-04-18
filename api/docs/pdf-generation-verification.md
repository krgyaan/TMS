# PDF Generation and Email Attachment Verification Guide

## Overview

This document outlines how to verify that PDFs are being generated correctly and attached to emails.

## PDF Generation Flow

1. **Trigger**: Payment request execution for DD, FDR, or BG instruments
2. **Generation**: `EmdsService.generatePdfsForInstrument()` calls `PdfGeneratorService.generatePdfs()`
3. **Storage**: PDFs are saved to `uploads/tendering/payment-pdfs/{storagePath}/`
4. **Database**: Relative paths stored in `payment_instruments.generatedPdf` and `extraPdfPaths`

## Email Attachment Flow

1. **Collection**: PDF paths collected from `instrument.generatedPdf` and `instrument.extraPdfPaths`
2. **Resolution**: `EmailService.resolveAttachments()` resolves relative paths to absolute paths
3. **Path Resolution**: Uses `TenderFilesService.getAbsolutePath()` which joins with `uploads/tendering`
4. **Attachment**: Files attached via Gmail API in MIME message

## Verification Steps

### 1. Verify PDF Generation

**Check logs for:**
```
Generated X PDF(s) for instrument {id} ({mode})
Generated PDF: payment-pdfs/{storagePath}/{filename}.pdf
```

**Check database:**
```sql
SELECT id, instrument_type, generated_pdf, extra_pdf_paths 
FROM payment_instruments 
WHERE generated_pdf IS NOT NULL 
ORDER BY updated_at DESC 
LIMIT 10;
```

**Check file system:**
```bash
# Verify PDFs exist on disk
ls -lh uploads/tendering/payment-pdfs/bgpdfs/
ls -lh uploads/tendering/payment-pdfs/chqcreate/
```

### 2. Verify Email Attachments

**Check logs for:**
```
Attaching X PDF(s) to {mode} email for instrument {id}: {paths}
resolveAttachments: resolved X attachments out of Y requested
```

**Check for warnings:**
```
Attachment not found on disk for RFQ/tender email: {path}
```
If this appears, the PDF path resolution failed.

**Check email logs table:**
```sql
SELECT id, event_type, subject, status, created_at 
FROM email_logs 
WHERE event_type LIKE 'payment-request.%' 
ORDER BY created_at DESC 
LIMIT 10;
```

### 3. Verify Image Assets

**Check assets directory exists:**
```bash
ls -lh api/src/modules/pdf/assets/
```

**Required images:**
- logo.png
- phone.png
- email.png
- web.png
- tick.png
- cross.png

**Check logs for missing images:**
```
PDF image asset not found: {imageName} at {path}
```
If this appears, add the missing image file.

### 4. Test PDF Generation

**Manual test:**
1. Create a payment request for DD/FDR/BG
2. Execute the request (accept/create)
3. Check that PDFs are generated
4. Check that email is sent with attachments
5. Verify PDFs contain images (not broken placeholders)

## Common Issues

### PDFs not generating
- Check Puppeteer browser is initialized (check logs for "Puppeteer browser launched")
- Check system dependencies are installed (see puppeteer-setup.md)
- Check disk space in `uploads/tendering/payment-pdfs/`

### PDFs not attaching to email
- Verify PDF paths in database match actual file locations
- Check that `TenderFilesService.getAbsolutePath()` resolves correctly
- Ensure `baseDir` is not set (should be undefined for payment-pdfs paths)

### Images missing in PDFs
- Verify image files exist in `api/src/modules/pdf/assets/`
- Check logs for "PDF image asset not found" warnings
- Restart application to clear image cache if images were added

## Path Resolution Details

**PDF Storage:**
- Absolute: `{cwd}/uploads/tendering/payment-pdfs/{storagePath}/{filename}.pdf`
- Relative (stored in DB): `payment-pdfs/{storagePath}/{filename}.pdf`

**Email Attachment Resolution:**
- Input: `payment-pdfs/{storagePath}/{filename}.pdf` (no baseDir)
- Resolved: `{cwd}/uploads/tendering/payment-pdfs/{storagePath}/{filename}.pdf`
- Matches storage location ✓
