// Function to format keys from snake_case/camelCase to readable format
export const formatKey = (str: string) => {
    return str
        // Convert camelCase to snake_case first
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        // Replace underscores with spaces
        .replace(/_/g, ' ')
        // Capitalize first letter of each word
        .replace(/\b\w/g, char => char.toUpperCase());
};

// Function to format values from snake_case/camelCase to readable format
export const formatValue = (value: any) => {
    if (typeof value === 'string') {
        // Check if it's an ISO date string (contains T between date and time)
        const isISODate = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);

        if (isISODate) {
            // For ISO dates, replace T with space and optionally format the date
            return value.replace('T', ' ').replace(/\.\d{3}Z?$/, '');
        }

        return value
            // Convert camelCase to snake_case first
            .replace(/([a-z])([A-Z])/g, '$1_$2')
            // Replace underscores with spaces
            .replace(/_/g, ' ')
            // Replace hyphens with spaces (except for dates in YYYY-MM-DD format)
            .replace(/(?<!\d{4})-(?!\d{2}-\d{2})/g, ' ')
            .replace(/(?<!\d{4}-\d{2})-(?!\d{2})/g, ' ')
            // Capitalize first letter of each word
            .replace(/\b\w/g, char => char.toUpperCase());
    }
    return value;
};