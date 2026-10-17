const db = require('../config/db');
const { logAudit } = require('../services/auditService');

function getFines(req, res) {
  const { status, user_id } = req.query || {};
  let list = db.fines.map(f => {
    const u = db.users.find(user => user.id === f.user_id);
    const loan = db.borrow_records.find(b => b.id === f.borrow_id);
    const book = loan ? db.books.find(bk => bk.id === loan.book_id) : null;

    return {
      ...f,
      patron_name: u ? u.full_name : 'Unknown',
      patron_id: u ? u.patron_id : 'Unknown',
      book_title: book ? book.title : 'Unknown'
    };
  });

  if (status) {
    list = list.filter(f => f.status.toLowerCase() === status.toLowerCase());
  }

  if (user_id) {
    list = list.filter(f => f.user_id === parseInt(user_id, 10));
  }

  res.json({
    total: list.length,
    fines: list
  });
}

function collectFine(req, res) {
  const fineId = parseInt(req.params.id, 10);
  const { payment_method = 'UPI' } = req.body || {};

  const fine = db.fines.find(f => f.id === fineId);
  if (!fine) {
    return res.status(404).json({ error: 'Fine record not found' });
  }

  if (fine.status === 'Paid') {
    return res.status(400).json({ error: 'Fine is already marked as Paid' });
  }

  fine.status = 'Paid';
  fine.paid_at = new Date().toISOString();
  fine.collected_by = 3; // Ramesh Kumar (Desk Staff)
  fine.payment_method = payment_method;

  const receiptNo = `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  logAudit({
    actor_id: 3,
    action_key: 'fines.collect',
    target_resource: `FINE:${fine.id}`,
    payload: {
      amount: fine.amount,
      method: payment_method,
      receipt: receiptNo
    }
  });

  res.json({
    message: `Payment of ₹${fine.amount.toFixed(2)} recorded via ${payment_method}.`,
    receipt_no: receiptNo,
    fine
  });
}

function waiveFine(req, res) {
  const fineId = parseInt(req.params.id, 10);
  const { waiver_reason } = req.body || {};

  if (!waiver_reason) {
    return res.status(400).json({ error: 'A mandatory waiver justification reason is required for institutional audit compliance.' });
  }

  const fine = db.fines.find(f => f.id === fineId);
  if (!fine) {
    return res.status(404).json({ error: 'Fine record not found' });
  }

  fine.status = 'Waived';
  fine.waiver_reason = waiver_reason;
  fine.paid_at = new Date().toISOString();

  logAudit({
    actor_id: 2, // Librarian
    action_key: 'fines.waive',
    target_resource: `FINE:${fine.id}`,
    payload: {
      amount: fine.amount,
      reason: waiver_reason
    }
  });

  res.json({
    message: `Fine of ₹${fine.amount.toFixed(2)} successfully waived.`,
    fine
  });
}

module.exports = {
  getFines,
  collectFine,
  waiveFine
};
