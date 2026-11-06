import React from 'react';
import ProductThumbnail from './ProductThumbnail';

const money = value => value == null ? '—' : `$${value.toFixed(2)}`;
function Row({ label, children }) {
  return <div><dt>{label}</dt><dd>{children ?? '—'}</dd></div>;
}
export default function PurchaseSummary({ order }) {
  const { delivery, dispute, breakdown, items = [] } = order;
  return <section className="card purchase-summary">
    <div className="card-heading"><h2>Purchase summary</h2><span className="muted">#{order.id}</span></div>
    <div className="product featured"><ProductThumbnail imageUrl={order.imageUrl} /><div><strong>{order.name}</strong><small>{order.seller}</small></div></div>
    <dl>
      <Row label="Order total">{money(order.price)}</Row>
      <Row label="Purchased">{order.date}</Row>
      <Row label="Transaction ID"><span className="transaction-reference">{order.transactionId || '—'}</span></Row>
      <Row label="Payment">{order.paymentLabel}</Row>
      <Row label="Status"><span className="badge">{order.status}</span></Row>
    </dl>
    <div className="summary-section"><h3>Buyer</h3><dl><Row label="Name">{order.buyer}</Row><Row label="Email">{order.buyerEmail ? <a href={`mailto:${order.buyerEmail}`}>{order.buyerEmail}</a> : '—'}</Row></dl></div>
    <div className="summary-section"><h3>Delivery & protection</h3><dl>
      <Row label="Carrier">{delivery?.carrier}</Row>
      <Row label="Tracking">{delivery?.trackingNumber || 'Not provided'}</Row>
      <Row label={delivery?.deliveredAt ? 'Delivered' : 'Expected delivery'}>{delivery?.deliveredAt || delivery?.expectedAt}</Row>
      <Row label="Protection"><span className="badge">{order.protectionStatus || 'Not reviewed'}</span></Row>
    </dl></div>
    <div className="summary-section"><h3>Dispute</h3>{dispute ? <dl>
      <Row label="Case">{dispute.caseId}</Row>
      <Row label="Reason">{dispute.reason}</Row>
      <Row label="Status"><span className="badge">{dispute.status}</span></Row>
      {dispute.responseDeadline && <Row label="Respond by"><span className="response-deadline">{dispute.responseDeadline}</span></Row>}
    </dl> : <p className="summary-no-dispute">No dispute on this transaction.</p>}</div>
    <section className="summary-section"><h3>Amount breakdown</h3><dl>
      <Row label="Items">{money(breakdown?.subtotal)}</Row><Row label="Shipping">{money(breakdown?.shipping)}</Row><Row label="Tax">{money(breakdown?.tax)}</Row><Row label="Order total">{money(order.price)}</Row><Row label="Refunded">{money(breakdown?.refunded)}</Row>
    </dl></section>
    <section className="summary-section"><h3>Item details <span className="muted">{items.length}</span></h3>{items.length ? items.map(item => <div className="summary-item" key={item.sku}><strong>{item.name}</strong><dl><Row label="SKU">{item.sku}</Row><Row label="Variant">{item.variant}</Row><Row label="Quantity">{item.quantity}</Row><Row label="Unit price">{money(item.unitPrice)}</Row></dl></div>) : <p>No item details available.</p>}</section>
  </section>;
}
