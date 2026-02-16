# PDF Template Image Assets

This directory contains image assets used in PDF templates.

## Required Images

The following PNG image files are required for PDF generation:

- **logo.png** - Company/Organization logo (used in all templates)
- **phone.png** - Phone icon (used in header/footer)
- **email.png** - Email icon (used in header/footer)
- **web.png** - Website icon (used in header/footer)
- **tick.png** - Checkmark/tick icon (used in indicative template)
- **cross.png** - Cross/X icon (used in indicative template)

## Image Format

- Format: PNG
- These images are loaded and converted to base64 strings
- Images are cached in memory after first load for performance

## Usage

Images are automatically loaded by `PdfGeneratorService` when generating PDFs. The service will:
1. Look for images in this directory (`api/src/modules/pdf/assets/` in dev, `api/dist/modules/pdf/assets/` in prod)
2. Convert them to base64 strings
3. Inject them into PDF template data as:
   - `img_logo_base64`
   - `img_phone_base64`
   - `img_email_base64`
   - `img_web_base64`
   - `img_tick_base64`
   - `img_cross_base64`

## Missing Images

If an image file is missing, a warning will be logged but PDF generation will continue. The template will render with an empty base64 string, which may result in broken image placeholders in the PDF.

## Adding Images

1. Place PNG image files in this directory
2. Ensure filenames match exactly (case-sensitive)
3. Restart the application to clear the image cache
