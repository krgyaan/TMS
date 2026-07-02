const inrFormatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

export const formatINR = (value: string | number) => {
    const numericValue = Number(value);
    if (isNaN(numericValue)) {
        return '₹0';
    }
    return inrFormatter.format(numericValue);
};
