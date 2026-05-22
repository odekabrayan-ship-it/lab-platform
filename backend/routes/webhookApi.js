const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_secret_key');
const { dbRun } = require('../services/businessLogic'); 

// Note: Ensure that express.raw is used before express.json parsing in server.js
// so that the webhook endpoint gets the raw buffer.
// Actually, in server.js we do `app.use(express.json())` globally, which can mess up Stripe.
// We will modify server.js to use express.json() for everything except webhooks.
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock_secret';
        
        // Use req.body if raw body middleware parses correctly, or fallback for mocks
        // In dev without signatures, we might just bypass signature verification
        if (process.env.NODE_ENV === 'production' || process.env.STRIPE_WEBHOOK_SECRET) {
            event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
        } else {
            // Mock event for local testing without signature
            event = req.body;
            if (Buffer.isBuffer(req.body)) {
                event = JSON.parse(req.body.toString());
            }
        }
    } catch (err) {
        console.error(`Webhook signature verification failed:`, err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                
                if (session.mode === 'subscription' && session.subscription) {
                    const tenantId = session.metadata?.tenantId;
                    const tenantType = session.metadata?.tenantType;
                    const customerId = session.customer;
                    const subscriptionId = session.subscription;

                    if (tenantType === 'lab') {
                        await dbRun(`
                            UPDATE laboratories 
                            SET subscription_status = 'ACTIVE', 
                                stripe_customer_id = ?, 
                                stripe_subscription_id = ?,
                                subscription_expiry = datetime('now', '+30 days')
                            WHERE id = ?`, 
                            [customerId, subscriptionId, tenantId]
                        );
                    } else if (tenantType === 'client') {
                        await dbRun(`
                            UPDATE clients 
                            SET subscription_status = 'ACTIVE', 
                                stripe_customer_id = ?, 
                                stripe_subscription_id = ?,
                                subscription_expiry = datetime('now', '+30 days')
                            WHERE id = ?`, 
                            [customerId, subscriptionId, tenantId]
                        );
                    }
                }
                break;
            }
            case 'invoice.payment_succeeded': {
                const invoice = event.data.object;
                if (invoice.subscription) {
                    const subscriptionId = invoice.subscription;
                    
                    await dbRun(`UPDATE laboratories SET subscription_status = 'ACTIVE', subscription_expiry = datetime('now', '+30 days') WHERE stripe_subscription_id = ?`, [subscriptionId]);
                    await dbRun(`UPDATE clients SET subscription_status = 'ACTIVE', subscription_expiry = datetime('now', '+30 days') WHERE stripe_subscription_id = ?`, [subscriptionId]);
                }
                break;
            }
            case 'invoice.payment_failed':
            case 'customer.subscription.deleted': {
                const invoiceOrSub = event.data.object;
                const subscriptionId = invoiceOrSub.subscription || invoiceOrSub.id;
                
                const newStatus = event.type === 'customer.subscription.deleted' ? 'SUSPENDED' : 'PAST_DUE';
                
                await dbRun(`UPDATE laboratories SET subscription_status = ? WHERE stripe_subscription_id = ?`, [newStatus, subscriptionId]);
                await dbRun(`UPDATE clients SET subscription_status = ? WHERE stripe_subscription_id = ?`, [newStatus, subscriptionId]);
                break;
            }
            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        res.json({ received: true });
    } catch (err) {
        console.error(`Error processing webhook:`, err);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

module.exports = router;
