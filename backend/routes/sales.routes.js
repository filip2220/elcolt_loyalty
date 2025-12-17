/**
 * Sales Routes
 * 
 * Handles sales and offers:
 * - GET /sales/public - Get WooCommerce products on sale
 * - GET /sales/app-exclusive - Get WPLoyalty app-exclusive offers
 */

const express = require('express');
const db = require('../db');
const { fixImageUrl } = require('../utils/imageUtils');

const router = express.Router();

/**
 * GET /sales/public
 * Returns products currently on sale from WooCommerce
 */
router.get('/sales/public', async (req, res) => {
    try {
        const query = `
            SELECT DISTINCT
                p.ID as id,
                p.post_title as name,
                regular.meta_value as regular_price,
                sale.meta_value as sale_price,
                (SELECT img.guid FROM el1posts img WHERE img.ID = CAST(thumb_id.meta_value AS UNSIGNED) AND img.post_type = 'attachment' LIMIT 1) as thumbnail_url,
                sale_from.meta_value as sale_from,
                sale_to.meta_value as sale_to
            FROM el1posts p
            LEFT JOIN el1postmeta regular ON p.ID = regular.post_id AND regular.meta_key = '_regular_price'
            LEFT JOIN el1postmeta sale ON p.ID = sale.post_id AND sale.meta_key = '_sale_price'
            LEFT JOIN el1postmeta thumb_id ON p.ID = thumb_id.post_id AND thumb_id.meta_key = '_thumbnail_id'
            LEFT JOIN el1postmeta sale_from ON p.ID = sale_from.post_id AND sale_from.meta_key = '_sale_price_dates_from'
            LEFT JOIN el1postmeta sale_to ON p.ID = sale_to.post_id AND sale_to.meta_key = '_sale_price_dates_to'
            WHERE p.post_type = 'product' 
              AND p.post_status = 'publish'
              AND p.post_parent = 0
              AND sale.meta_value IS NOT NULL 
              AND sale.meta_value != ''
            ORDER BY p.post_title
            LIMIT 50
        `;

        const [sales] = await db.query(query);

        const salesWithDiscount = sales.map(product => {
            const regular = parseFloat(product.regular_price) || 0;
            const sale = parseFloat(product.sale_price) || 0;
            const discountPercent = regular > 0 ? Math.round((1 - sale / regular) * 100) : 0;

            return {
                ...product,
                thumbnail_url: fixImageUrl(product.thumbnail_url),
                discount_percent: discountPercent
            };
        });

        res.json({
            sales: salesWithDiscount,
            count: salesWithDiscount.length
        });

    } catch (error) {
        console.error('Get public sales error:', error);
        res.status(500).json({ message: 'Błąd serwera podczas pobierania promocji.' });
    }
});

/**
 * GET /sales/app-exclusive
 * Returns app-exclusive offers from WPLoyalty rewards
 */
router.get('/sales/app-exclusive', async (req, res) => {
    try {
        const query = `
            SELECT 
                id,
                name,
                display_name,
                description,
                discount_type,
                discount_value,
                require_point as points_required,
                reward_type,
                free_product,
                conditions
            FROM el1wlr_rewards 
            WHERE active = 1 
              AND is_show_reward = 1
            ORDER BY ordering
        `;

        const [offers] = await db.query(query);

        // Parse conditions to extract product info
        const offersWithProductInfo = offers.map(offer => {
            let applicable_products = [];

            if (offer.conditions) {
                try {
                    const conditions = JSON.parse(offer.conditions);
                    for (const condition of conditions) {
                        if (condition.type === 'products' && condition.options?.value) {
                            const products = condition.options.value;
                            if (Array.isArray(products)) {
                                applicable_products = products.map(p => ({
                                    id: p.value,
                                    name: p.label?.replace(/^#\d+\s+/, '') || `Produkt #${p.value}`
                                }));
                            }
                        } else if (condition.type === 'product_category' && condition.options?.value) {
                            const categories = condition.options.value;
                            if (Array.isArray(categories)) {
                                applicable_products = categories.map(c => ({
                                    id: c.value,
                                    name: `Kategoria: ${c.label}`,
                                    isCategory: true
                                }));
                            }
                        }
                    }
                } catch (e) {
                    console.error('Failed to parse conditions for offer', offer.id, e);
                }
            }

            if (offer.free_product) {
                try {
                    const freeProducts = JSON.parse(offer.free_product);
                    if (Array.isArray(freeProducts)) {
                        applicable_products = freeProducts.map(p => ({
                            id: p.value,
                            name: p.label?.replace(/^#\d+\s+/, '') || `Produkt #${p.value}`
                        }));
                    }
                } catch (e) {
                    console.error('Failed to parse free_product for offer', offer.id, e);
                }
            }

            const { conditions: _, free_product: __, ...offerData } = offer;

            return {
                ...offerData,
                applicable_products
            };
        });

        // Collect all product IDs to fetch thumbnails
        const allProductIds = [];
        for (const offer of offersWithProductInfo) {
            for (const product of offer.applicable_products) {
                if (!product.isCategory && product.id) {
                    const productId = parseInt(product.id, 10);
                    if (!isNaN(productId) && !allProductIds.includes(productId)) {
                        allProductIds.push(productId);
                    }
                }
            }
        }

        // Fetch thumbnails in a single query
        let thumbnailMap = {};
        if (allProductIds.length > 0) {
            const placeholders = allProductIds.map(() => '?').join(',');
            const thumbnailQuery = `
                SELECT 
                    pm.post_id as product_id,
                    att.guid as thumbnail_url
                FROM el1postmeta pm
                INNER JOIN el1posts att ON pm.meta_value = att.ID
                WHERE pm.meta_key = '_thumbnail_id'
                  AND pm.post_id IN (${placeholders})
            `;
            const [thumbnails] = await db.query(thumbnailQuery, allProductIds);

            for (const row of thumbnails) {
                thumbnailMap[row.product_id] = fixImageUrl(row.thumbnail_url);
            }
        }

        // Add thumbnail_url to each product
        for (const offer of offersWithProductInfo) {
            for (const product of offer.applicable_products) {
                if (!product.isCategory) {
                    const productId = parseInt(product.id, 10);
                    product.thumbnail_url = thumbnailMap[productId] || null;
                }
            }
        }

        res.json({
            offers: offersWithProductInfo,
            count: offersWithProductInfo.length
        });

    } catch (error) {
        console.error('Get app-exclusive offers error:', error);
        res.status(500).json({ message: 'Błąd serwera podczas pobierania ofert.' });
    }
});

module.exports = router;
