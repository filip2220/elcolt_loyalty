/**
 * Utility functions for Polish localization
 */

/**
 * Formats a number according to Polish standards
 * - Uses comma (,) as decimal separator
 * - Uses space as thousands separator
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted number string
 */
export function formatPolishNumber(value: number, decimals: number = 2): string {
    return value.toLocaleString('pl-PL', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

/**
 * Formats a currency amount in Polish złoty (zł)
 * @param value - The amount to format
 * @returns Formatted currency string with zł symbol
 */
export function formatPolishCurrency(value: number): string {
    return `${formatPolishNumber(value, 2)} zł`;
}

/**
 * Formats a date according to Polish standards
 * @param date - The date to format
 * @returns Formatted date string
 */
export function formatPolishDate(date: Date | string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('pl-PL', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

/**
 * Formats a number for display (no decimals, with thousands separator)
 * @param value - The number to format
 * @returns Formatted number string
 */
export function formatPolishInteger(value: number): string {
    return value.toLocaleString('pl-PL');
}
