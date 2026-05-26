router.post('/create-order', async (req, res) => {

  const { amount, customerName, customerPhone, customerEmail } = req.body;

  console.log('Create Order Received:', {
    amount,
    customerName,
    customerPhone,
    customerEmail
  });

  if (!amount || Number(amount) <= 0 || !customerPhone) {

    return res.status(400).json({
      success: false,
      message: 'Invalid amount or phone number'
    });

  }

  const parsedAmount = Number(amount);

  // LOCAL UUID
  const orderId = uuidv4();

  // HUMAN READABLE ORDER NUMBER
  const orderNumber =
    `ORD-${Date.now()}-${Math.floor(Math.random() * 9999)}`;

  try {

    // ================= INSERT INTO DB =================

    const insertResult = await pool.query(

      `INSERT INTO ms_orders
      (
        order_id,
        order_number,
        order_amount,
        currency,
        payer_name,
        payer_mobile,
        payer_email,
        transaction_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')
      RETURNING *`,

      [
        orderId,
        orderNumber,
        parsedAmount,
        'INR',
        customerName,
        customerPhone,
        customerEmail
      ]

    );

    console.log('✅ ORDER INSERTED IN DB');

    console.log(insertResult.rows[0]);

    // ================= GET TOKEN =================

    const token = await getToken();

    // ================= PAYLOAD =================

    const orderPayload = {

      referenceId: orderId,

      merchantOrderId: orderNumber,

      amount: parsedAmount,

      currency: 'INR',

      customerName: customerName || 'Driver',

      customerEmail:
        customerEmail || process.env.DEFAULT_EMAIL,

      customerPhone: customerPhone,

      notifyUrl: process.env.PAYYANTRA_NOTIFY_URL,

      returnUrl: process.env.PAYYANTRA_RETURN_URL,

      allowedPaymentMethods: [
        'UPI',
        'CREDIT_CARD',
        'DEBIT_CARD',
        'INTERNET_BANKING'
      ]

    };

    console.log('Sending to PayYantra:', orderPayload);

    // ================= CREATE PAYYANTRA ORDER =================

    const orderRes = await fetch(
      `${BASE_URL}/api/v2/merchant/orders`,
      {
        method: 'POST',

        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },

        body: JSON.stringify(orderPayload)
      }
    );

    const orderData = await orderRes.json();

    console.log('PayYantra Response:', orderData);

    if (!orderRes.ok) {

      throw new Error(
        orderData.message ||
        `PayYantra Error: ${orderRes.status}`
      );

    }

    // ================= UPDATE PG TRANSACTION ID =================

    if (orderData?.data?.transactionId) {

      await pool.query(

        `UPDATE ms_orders
         SET pg_transaction_id = $1
         WHERE order_id = $2`,

        [
          orderData.data.transactionId,
          orderId
        ]

      );

    }

    // ================= CHECKOUT URL =================

    const checkoutUrl =
      orderData?.data?.checkoutUrl ||
      orderData?.data?.data?.checkoutUrl ||
      orderData?.checkoutUrl;

    if (!checkoutUrl) {

      throw new Error(
        'No checkout URL received from PayYantra'
      );

    }

    // ================= FINAL RESPONSE =================

    res.json({

      success: true,

      orderId,

      orderNumber,

      checkoutUrl,

      paymentUrl: checkoutUrl,

      data: orderData

    });

  } catch (err) {

    console.error('❌ CREATE ORDER ERROR');

    console.error(err);

    res.status(500).json({

      success: false,

      message: 'Payment initiation failed',

      error: err.message

    });

  }

});