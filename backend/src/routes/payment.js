// ====================== WEBHOOK ======================
router.post('/webhook', async (req, res) => {

  const body = req.body;

  console.log('🔥 Webhook received:', JSON.stringify(body, null, 2));

  try {

    const payload = body.data || body;

    const orderId =
      payload.referenceId ||
      payload.merchantOrderId ||
      payload.orderId;

    let rawStatus =
      payload.transactionStatus ||
      payload.status;

    let status = rawStatus
      ? String(rawStatus).toUpperCase()
      : 'PENDING';

    if (status === 'INITIATED') status = 'PENDING';
    if (status === 'SUCCESSFUL') status = 'SUCCESS';

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'orderId missing'
      });
    }

    console.log('🔍 Updating Order:', orderId);
    console.log('📌 Final Status:', status);

    const localOrder = await pool.query(
      `SELECT * FROM ms_orders
       WHERE order_id = $1
       OR order_number = $1
       LIMIT 1`,
      [orderId]
    );

    if (localOrder.rows.length === 0) {

      console.log('❌ Order not found in DB');

      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });

    }

    const paymentMode =
      payload.paymentMode ||
      payload.paymentMethod ||
      payload.payment_mode ||
      payload.method ||
      null;

    // ✅ MAIN UPDATE QUERY
    await pool.query(
      `UPDATE ms_orders SET
        transaction_status = $1,
        transaction_status_code = $2,
        pg_transaction_id = COALESCE($3, pg_transaction_id),
        bank_reference_no = COALESCE($4, bank_reference_no),
        bank_utr_no = COALESCE($5, bank_utr_no),
        payment_mode = COALESCE($6, payment_mode),
        payment_response = $7,
        order_completion_date = NOW()
       WHERE order_id = $8
       OR order_number = $8`,
      [
        status,
        payload.statusCode || null,
        payload.transactionId || payload.transactionPublicId || null,
        payload.bankReferenceNo || payload.rrn || null,
        payload.bankUTRNo || null,
        paymentMode,
        JSON.stringify(payload),
        orderId
      ]
    );

    console.log('✅ ORDER UPDATED SUCCESSFULLY');

    // ✅ WALLET UPDATE ONLY ON SUCCESS
    if (
      status === 'SUCCESS' &&
      localOrder.rows[0].transaction_status !== 'SUCCESS'
    ) {

      const amount = parseFloat(
        localOrder.rows[0].order_amount || 0
      );

      await pool.query(
        `UPDATE driver_details
         SET
           wallet_balance = COALESCE(wallet_balance, 0) + $1,
           amount_paid_today = COALESCE(amount_paid_today, 0) + $1,
           updated_at = NOW()
         WHERE user_id = (
           SELECT id
           FROM users
           WHERE phone_number = $2
           LIMIT 1
         )`,
        [
          amount,
          localOrder.rows[0].payer_mobile
        ]
      );

      console.log(
        `💰 Wallet Updated +₹${amount}`
      );
    }

    return res.json({
      success: true,
      message: 'Webhook processed successfully'
    });

  } catch (err) {

    console.error('❌ WEBHOOK ERROR:', err);

    return res.status(500).json({
      success: false,
      message: 'Webhook processing failed',
      error: err.message
    });

  }

});