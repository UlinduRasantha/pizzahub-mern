const nodemailer = require('nodemailer')
const logger     = require('./logger')

const createTransport = () =>
  nodemailer.createTransport({
    host:   process.env.EMAIL_HOST,
    port:   Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_PORT === '465',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  })

// ─── Generic send ─────────────────────────────────────────────────────────────
const sendEmail = async ({ to, subject, html }) => {
  if (process.env.NODE_ENV === 'test') return
  if (!to) { logger.warn('sendEmail: no recipient address — skipping'); return }
  try {
    const transporter = createTransport()
    await transporter.sendMail({
      from: `PizzaHub <${process.env.EMAIL_FROM}>`,
      to, subject, html,
    })
    logger.info(`Email sent to ${to}: ${subject}`)
  } catch (err) {
    logger.error(`Failed to send email to ${to}: ${err.message}`)
  }
}

// ─── Shared HTML helpers ──────────────────────────────────────────────────────
const header = () => `
  <div style="background:#1A1A2E;padding:28px 32px;border-radius:12px 12px 0 0;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:26px;font-family:Arial,sans-serif;letter-spacing:-0.5px">
      🍕 PizzaHub
    </h1>
  </div>`

const footer = () => `
  <div style="padding:20px 32px;text-align:center;border-top:1px solid #f0f0f0;margin-top:8px">
    <p style="font-size:12px;color:#aaa;margin:0;font-family:Arial,sans-serif">
      © 2026 PizzaHub · All rights reserved ·
      <a href="#" style="color:#aaa;text-decoration:none">Unsubscribe</a>
    </p>
  </div>`

const itemsTable = (items) => `
  <table style="width:100%;border-collapse:collapse;font-size:14px;font-family:Arial,sans-serif;margin:16px 0">
    <thead>
      <tr style="background:#f9f9f9">
        <th style="text-align:left;padding:10px 8px;color:#555;font-weight:600;border-bottom:2px solid #eee">Item</th>
        <th style="text-align:center;padding:10px 8px;color:#555;font-weight:600;border-bottom:2px solid #eee">Qty</th>
        <th style="text-align:right;padding:10px 8px;color:#555;font-weight:600;border-bottom:2px solid #eee">Price</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(i => `
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid #f5f5f5;color:#333">
            ${i.name}
            <span style="color:#999;font-size:12px"> — ${i.size}, ${i.crust} crust</span>
            ${i.extraToppings?.length ? `<br><span style="color:#aaa;font-size:11px">+ ${i.extraToppings.map(t => t.name || t).join(', ')}</span>` : ''}
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid #f5f5f5;text-align:center;color:#555">×${i.quantity}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #f5f5f5;text-align:right;color:#333;font-weight:500">$${i.subtotal.toFixed(2)}</td>
        </tr>`).join('')}
    </tbody>
  </table>`

const totalsBlock = (order) => `
  <table style="width:100%;border-collapse:collapse;font-size:14px;font-family:Arial,sans-serif;margin-top:4px">
    <tr>
      <td style="padding:6px 8px;color:#777">Subtotal</td>
      <td style="padding:6px 8px;text-align:right;color:#555">$${order.subtotal.toFixed(2)}</td>
    </tr>
    ${order.discount > 0 ? `
    <tr>
      <td style="padding:6px 8px;color:#27AE60">Discount</td>
      <td style="padding:6px 8px;text-align:right;color:#27AE60">-$${order.discount.toFixed(2)}</td>
    </tr>` : ''}
    <tr>
      <td style="padding:6px 8px;color:#777">Delivery fee</td>
      <td style="padding:6px 8px;text-align:right;color:#555">$${order.deliveryFee.toFixed(2)}</td>
    </tr>
    <tr>
      <td style="padding:6px 8px;color:#777">Tax</td>
      <td style="padding:6px 8px;text-align:right;color:#555">$${order.tax.toFixed(2)}</td>
    </tr>
    <tr style="border-top:2px solid #eee">
      <td style="padding:12px 8px;font-weight:bold;color:#1A1A2E;font-size:15px">Total charged</td>
      <td style="padding:12px 8px;text-align:right;font-weight:bold;color:#C0392B;font-size:16px">$${order.total.toFixed(2)}</td>
    </tr>
  </table>`

// ─── 1. Payment Receipt — sent immediately after successful checkout ───────────
const sendPaymentReceipt = (order, userEmail, userName) =>
  sendEmail({
    to:      userEmail,
    subject: `🧾 Your PizzaHub Receipt — ${order.orderNumber}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;border:1px solid #eee;border-radius:12px;overflow:hidden">
        ${header()}
        <div style="padding:32px">

          <h2 style="color:#1A1A2E;margin:0 0 4px">Payment confirmed ✅</h2>
          <p style="color:#777;margin:0 0 24px;font-size:14px">
            Hi ${userName || 'there'}, your payment was successful and your order is being prepared.
          </p>

          <!-- Order number badge -->
          <div style="background:#FDF2F2;border-left:4px solid #C0392B;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:24px">
            <p style="margin:0;font-size:12px;color:#999;text-transform:uppercase;letter-spacing:0.08em">Order Number</p>
            <p style="margin:4px 0 0;font-size:22px;font-weight:bold;color:#C0392B;letter-spacing:0.5px">${order.orderNumber}</p>
          </div>

          <!-- Items -->
          <h3 style="color:#1A1A2E;font-size:14px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px">Items Ordered</h3>
          ${itemsTable(order.items)}

          <!-- Totals -->
          <div style="background:#fafafa;border-radius:8px;padding:4px 8px;margin-top:8px">
            ${totalsBlock(order)}
          </div>

          <!-- Payment info row -->
          <div style="display:flex;gap:16px;margin-top:20px">
            <div style="flex:1;background:#f9f9f9;border-radius:8px;padding:14px;text-align:center">
              <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.06em">Payment</p>
              <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#27AE60">✓ Paid via Stripe</p>
            </div>
            <div style="flex:1;background:#f9f9f9;border-radius:8px;padding:14px;text-align:center">
              <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.06em">Order type</p>
              <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#1A1A2E;text-transform:capitalize">${order.orderType}</p>
            </div>
            ${order.estimatedDelivery ? `
            <div style="flex:1;background:#f9f9f9;border-radius:8px;padding:14px;text-align:center">
              <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.06em">Est. delivery</p>
              <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#1A1A2E">${new Date(order.estimatedDelivery).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            </div>` : ''}
          </div>

          ${order.deliveryAddress ? `
          <!-- Delivery address -->
          <div style="margin-top:20px;padding:14px 16px;border:1px solid #eee;border-radius:8px">
            <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.06em">Delivering to</p>
            <p style="margin:4px 0 0;font-size:14px;color:#333">
              ${order.deliveryAddress.street}, ${order.deliveryAddress.city}, ${order.deliveryAddress.state} ${order.deliveryAddress.zip}
            </p>
          </div>` : ''}

          <p style="margin-top:24px;font-size:14px;color:#777;line-height:1.6">
            You can track your order in real time on the
            <a href="${process.env.CLIENT_URL}/orders/${order._id}" style="color:#C0392B;font-weight:600;text-decoration:none">PizzaHub app</a>.
            We'll also notify you as the status changes.
          </p>

        </div>
        ${footer()}
      </div>`,
  })

// ─── 2. Order status update — sent each time admin advances the status ─────────
const STATUS_COPY = {
  preparing:        { emoji: '👨‍🍳', title: 'Your order is being prepared!',   body: 'Our chefs are handcrafting your pizza right now. Won\'t be long!' },
  ready:            { emoji: '✅', title: 'Your order is ready!',              body: 'Your pizza is boxed up and ready. A delivery rider is being assigned.' },
  out_for_delivery: { emoji: '🛵', title: 'Your order is on its way!',         body: 'Your pizza is en route. Track it live in the PizzaHub app.' },
  delivered:        { emoji: '🏠', title: 'Your order has been delivered!',    body: 'Enjoy your pizza! Don\'t forget to confirm receipt and leave a review.' },
  cancelled:        { emoji: '❌', title: 'Your order has been cancelled.',    body: 'Your order was cancelled. If you were charged, a refund will appear within 5–10 business days.' },
}

const sendOrderStatusUpdate = (order, userEmail, userName, newStatus) => {
  const copy = STATUS_COPY[newStatus]
  if (!copy) return Promise.resolve()   // don't send for 'received'

  return sendEmail({
    to:      userEmail,
    subject: `${copy.emoji} ${copy.title} — ${order.orderNumber}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;border:1px solid #eee;border-radius:12px;overflow:hidden">
        ${header()}
        <div style="padding:32px">

          <div style="text-align:center;padding:12px 0 20px">
            <span style="font-size:52px">${copy.emoji}</span>
          </div>

          <h2 style="color:#1A1A2E;margin:0 0 8px;text-align:center">${copy.title}</h2>
          <p style="color:#777;font-size:14px;text-align:center;margin:0 0 28px;line-height:1.6">${copy.body}</p>

          <!-- Order badge -->
          <div style="background:#FDF2F2;border-radius:8px;padding:14px 18px;text-align:center;margin-bottom:24px">
            <p style="margin:0;font-size:12px;color:#999">Order</p>
            <p style="margin:4px 0 0;font-size:20px;font-weight:bold;color:#C0392B">${order.orderNumber}</p>
          </div>

          <!-- Status progress -->
          <div style="display:flex;justify-content:center;align-items:center;gap:0;margin-bottom:24px">
            ${['received','preparing','ready','out_for_delivery','delivered'].map((s, i, arr) => {
              const steps = ['received','preparing','ready','out_for_delivery','delivered']
              const currentIdx = steps.indexOf(newStatus)
              const stepIdx    = steps.indexOf(s)
              const done       = stepIdx <= currentIdx
              const labels     = { received:'Received', preparing:'Preparing', ready:'Ready', out_for_delivery:'On the way', delivered:'Delivered' }
              return `
                <div style="display:flex;flex-direction:column;align-items:center;flex:1">
                  <div style="width:28px;height:28px;border-radius:50%;background:${done ? '#C0392B' : '#eee'};
                    display:flex;align-items:center;justify-content:center;font-size:11px;
                    color:${done ? '#fff' : '#aaa'};font-weight:bold;margin-bottom:4px">
                    ${done ? '✓' : i + 1}
                  </div>
                  <span style="font-size:10px;color:${done ? '#C0392B' : '#bbb'};text-align:center;
                    font-weight:${s === newStatus ? '700' : '400'}">${labels[s]}</span>
                </div>
                ${i < arr.length - 1 ? `<div style="flex:1;height:2px;background:${stepIdx < currentIdx ? '#C0392B' : '#eee'};margin-bottom:18px"></div>` : ''}`
            }).join('')}
          </div>

          <div style="text-align:center">
            <a href="${process.env.CLIENT_URL}/orders/${order._id}"
               style="display:inline-block;background:#C0392B;color:#fff;padding:14px 32px;
                      border-radius:10px;text-decoration:none;font-weight:bold;font-size:14px">
              Track your order →
            </a>
          </div>

        </div>
        ${footer()}
      </div>`,
  })
}

// ─── 3. Order confirmed received ─────────────────────────────────────────────
const sendOrderReceived = (order, userEmail, userName) =>
  sendEmail({
    to:      userEmail,
    subject: `✅ Order Received — ${order.orderNumber}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;border:1px solid #eee;border-radius:12px;overflow:hidden">
        ${header()}
        <div style="padding:32px;text-align:center">
          <span style="font-size:52px">🙌</span>
          <h2 style="color:#1A1A2E;margin:16px 0 8px">Thanks for confirming, ${userName || 'friend'}!</h2>
          <p style="color:#777;font-size:14px;line-height:1.6;margin:0 0 24px">
            We're glad your order <strong style="color:#C0392B">${order.orderNumber}</strong> arrived safely.<br>
            We'd love to hear what you thought — it only takes a moment!
          </p>

          <div style="background:#FFF8E7;border-radius:12px;padding:20px;margin-bottom:24px">
            <p style="margin:0 0 10px;font-size:15px;font-weight:600;color:#1A1A2E">Rate your pizzas ⭐</p>
            <p style="margin:0;font-size:13px;color:#777">Your review helps other customers and our chefs improve.</p>
          </div>

          <a href="${process.env.CLIENT_URL}/orders/${order._id}"
             style="display:inline-block;background:#C0392B;color:#fff;padding:14px 32px;
                    border-radius:10px;text-decoration:none;font-weight:bold;font-size:14px">
            Leave a Review →
          </a>
        </div>
        ${footer()}
      </div>`,
  })

// ─── 4. Password reset ────────────────────────────────────────────────────────
const sendPasswordReset = (user, resetUrl) =>
  sendEmail({
    to:      user.email,
    subject: '🔐 Reset your PizzaHub password',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;border:1px solid #eee;border-radius:12px;overflow:hidden">
        ${header()}
        <div style="padding:32px">
          <h2 style="color:#1A1A2E">Password Reset</h2>
          <p style="color:#777;font-size:14px">Hi ${user.name || 'there'}, click below to reset your password. This link expires in 10 minutes.</p>
          <a href="${resetUrl}"
             style="display:inline-block;background:#C0392B;color:#fff;padding:14px 28px;
                    border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
            Reset Password
          </a>
          <p style="font-size:12px;color:#aaa">If you didn't request this, you can safely ignore this email.</p>
        </div>
        ${footer()}
      </div>`,
  })

module.exports = {
  sendEmail,
  sendPaymentReceipt,
  sendOrderStatusUpdate,
  sendOrderReceived,
  sendPasswordReset,
}
