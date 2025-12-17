/**
 * Image URL utilities for WordPress/WooCommerce compatibility
 * 
 * WordPress on cPanel often stores image URLs with technical server domains
 * which don't work properly in browsers. This module provides utilities to:
 * - Fix technical domain URLs to the production domain
 * - Validate and whitelist domains for image proxy (SSRF protection)
 */

// The production domain
const PRODUCTION_DOMAIN = 'https://etaktyczne.pl';

// Pattern to match common cPanel technical domain formats
const TECHNICAL_DOMAIN_PATTERNS = [
    // Current cPanel installation: boundless-olive-alligator.51-68-45-82.cpanel.site
    /^https?:\/\/[a-z0-9-]+\.[0-9-]+\.cpanel\.site/i,
    // Hostinger technical domains
    /^https?:\/\/srv\d+\.hstgr\.(cloud|io)/i,
    /^https?:\/\/server\d+\.hostinger\.com/i,
    // Generic cPanel subdomains
    /^https?:\/\/[a-z0-9-]+\.hstgr\.(cloud|io)/i,
];

/**
 * Fix WordPress image URLs that use technical server domains
 * 
 * @param {string|null} url - The original image URL from WordPress database
 * @returns {string|null} - The fixed URL with correct domain, or null if input was null
 */
function fixImageUrl(url) {
    if (!url) return null;

    // Try each pattern
    for (const pattern of TECHNICAL_DOMAIN_PATTERNS) {
        if (pattern.test(url)) {
            return url.replace(pattern, PRODUCTION_DOMAIN);
        }
    }

    return url;
}

// =====================================================
// SSRF Protection for Image Proxy
// =====================================================

// Whitelist of allowed image domains (prevents SSRF attacks)
const ALLOWED_IMAGE_DOMAINS = [
    'etaktyczne.pl',
    'elcolt.pl',
    'www.etaktyczne.pl',
    'www.elcolt.pl',
    // cPanel technical domains that may still appear in database
    /^[a-z0-9-]+\.[0-9-]+\.cpanel\.site$/i,
];

/**
 * Check if hostname matches an allowed domain for image proxy
 * 
 * @param {string} hostname - The hostname to check
 * @returns {boolean} - True if domain is allowed
 */
function isAllowedImageDomain(hostname) {
    const lowerHostname = hostname.toLowerCase();

    for (const allowed of ALLOWED_IMAGE_DOMAINS) {
        if (typeof allowed === 'string') {
            // Exact match or subdomain match
            if (lowerHostname === allowed || lowerHostname.endsWith('.' + allowed)) {
                return true;
            }
        } else if (allowed instanceof RegExp) {
            // Regex match
            if (allowed.test(lowerHostname)) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Check for private/internal IP addresses (blocks SSRF to internal networks)
 * 
 * @param {string} hostname - The hostname to check
 * @returns {boolean} - True if hostname is private/internal
 */
function isPrivateOrInternalHost(hostname) {
    // Block localhost variations
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
        return true;
    }

    // Block private IP ranges
    const privateIpPatterns = [
        /^10\./,                          // 10.0.0.0/8
        /^172\.(1[6-9]|2[0-9]|3[01])\./,  // 172.16.0.0/12
        /^192\.168\./,                     // 192.168.0.0/16
        /^169\.254\./,                     // Link-local
        /^0\./,                            // 0.0.0.0/8
        /^127\./,                          // Loopback
    ];

    for (const pattern of privateIpPatterns) {
        if (pattern.test(hostname)) {
            return true;
        }
    }

    // Block AWS/GCP/Azure metadata endpoints
    if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal') {
        return true;
    }

    return false;
}

module.exports = {
    fixImageUrl,
    isAllowedImageDomain,
    isPrivateOrInternalHost,
    PRODUCTION_DOMAIN,
    ALLOWED_IMAGE_DOMAINS,
    TECHNICAL_DOMAIN_PATTERNS
};
