from pathlib import Path

def convert_pdf_to_images(
    pdf_path: Path,
    output_dir: Path,
    dpi: int = 200
) -> list[Path]:
    import fitz  # PyMuPDF
    """
    Step 1: Open the PDF document.
    Step 2: Iterate pages, render each to a pixmap at target DPI.
    Step 3: Save each pixmap as PNG.
    Step 4: Return ordered list of image paths.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    image_paths: list[Path] = []

    # Step 1: Open document
    doc: fitz.Document = fitz.open(str(pdf_path))

    # DPI→zoom factor: fitz default is 72 DPI
    zoom = dpi / 72.0
    mat = fitz.Matrix(zoom, zoom)

    for page_num in range(len(doc)):
        # Step 2: Load page and render to pixmap (RGB, no alpha)
        page: fitz.Page = doc.load_page(page_num)
        pix: fitz.Pixmap = page.get_pixmap(matrix=mat, alpha=False)

        # Step 3: Save as PNG
        # Naming: page_0001.png (1-indexed)
        out_path = output_dir / f"page_{page_num + 1:04d}.png"
        pix.save(str(out_path))

        image_paths.append(out_path)
        pix = None  # Release pixmap memory explicitly

    doc.close()

    # Step 4: Return ordered list
    return sorted(image_paths)
