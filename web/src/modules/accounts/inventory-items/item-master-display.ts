export function itemMasterColumnsForViewport(width: number) {
    return {
        mobile: width < 768,
        hsn: width > 1280,
    };
}
