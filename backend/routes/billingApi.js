const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_secret_key');
const { ApiError, dbGet } = require('../services/businessLogic');

const SUBSCRIPTION_PRICE_KES = 5000;
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || 'price_1MockPriceIdFor5000KES';

router.post('/create-checkout-session', async (req, res, next) => {
    try {
        // We can extract tenant info directly from req.user if they are logged in, 
        // or accept it via body if a super admin is generating a link.
        // Assuming they are logged in and req.tenant_lab_id / req.tenant_client_id is available
        // BUT wait, this route might be hit before they are logged in? No, it's typically authenticated.
        const tenantId = req.tenant_lab_id || req.tenant_client_id;
        const tenantType = req.tenant_lab_id ? 'lab' : (req.tenant_client_id ? 'client' : null);
        
        if (!tenantId || !tenantType) {
            throw new ApiError('No associated tenant found for user. Cannot subscribe.', 400);
        }

        // Validate tenant exists
        let tenant;
        let customerId;
        if (tenantType === 'lab') {
            tenant = await dbGet(`SELECT id, name, stripe_customer_id FROM laboratories WHERE id = ?`, [tenantId]);
            customerId = tenant?.stripe_customer_id;
        } else if (tenantType === 'client') {
            tenant = await dbGet(`SELECT id, company_name as name, stripe_customer_id FROM clients WHERE id = ?`, [tenantId]);
            customerId = tenant?.stripe_customer_id;
        }

        if (!tenant) throw new ApiError('Tenant not found', 404);
        
        // Prepare checkout session payload
        const sessionPayload = {
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [
                {
                    price: STRIPE_PRICE_ID,
                    quantity: 1,
                },
            ],
            success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard?payment=success`,
            cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard?payment=cancelled`,
            metadata: {
                tenantId: tenantId.toString(),
                tenantType: tenantType
            }
        };

        // If we already have a customer, attach it
        if (customerId) {
            sessionPayload.customer = customerId;
        } else {
            sessionPayload.customer_email = req.user.email;
        }

        const session = await stripe.checkout.sessions.create(sessionPayload);

        res.json({ success: true, url: session.url, sessionId: session.id });
    } catch (err) {
        next(err);
    }
});

module.exports = router;
