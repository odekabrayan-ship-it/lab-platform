const { dbRun, dbAll, dbGet } = require('./database');

class BillingEngine {
    /**
     * Generates a Sovereign Invoice for a Trust Accelerator application.
     */
    static async generateTrustInvoice(clientId, tier, amount) {
        const client = await dbGet("SELECT company_name, user_id FROM clients WHERE id = ?", [clientId]);
        if (!client) throw new Error("Client not found");

        const invoiceNumber = `INV-T-${Date.now()}`;
        
        const result = await dbRun(
            `INSERT INTO invoices (
                client_id, amount, status, invoice_date, due_date, items, metadata
            ) VALUES (?, ?, 'UNPAID', CURRENT_DATE, date('now', '+7 days'), ?, ?)`,
            [
                clientId, 
                amount, 
                JSON.stringify([{ description: `Trust Accelerator Subscription: ${tier}`, quantity: 1, rate: amount }]),
                JSON.stringify({ type: 'TRUST_SUBSCRIPTION', tier, invoiceNumber })
            ]
        );

        // Record the financial event in the audit ledger
        await dbRun(
            "INSERT INTO audit_logs (user_id, action, entity_type, new_value) VALUES (?, ?, 'billing', ?)",
            [client.user_id, 'INVOICE_GENERATED', JSON.stringify({ invoiceId: result.lastID, amount, tier })]
        );

        return { id: result.lastID, invoiceNumber, amount };
    }

    /**
     * Handles the reconciliation of a trust payment.
     */
    static async reconcileTrustPayment(invoiceId, paymentRef) {
        const invoice = await dbGet("SELECT * FROM invoices WHERE id = ?", [invoiceId]);
        if (!invoice) throw new Error("Invoice not found");

        await dbRun("UPDATE invoices SET status = 'PAID', paid_at = CURRENT_TIMESTAMP WHERE id = ?", [invoiceId]);
        
        const metadata = JSON.parse(invoice.metadata);
        if (metadata.type === 'TRUST_SUBSCRIPTION') {
            await dbRun(
                "UPDATE clients SET subscription_status = 'ACTIVE', subscription_tier = ? WHERE id = ?",
                [metadata.tier, invoice.client_id]
            );
        }

        console.log(`RECONCILIATION SUCCESS: Invoice ${invoiceId} marked as PAID.`);
    }
}

module.exports = BillingEngine;
