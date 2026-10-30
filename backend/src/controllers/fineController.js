const mongoose = require('mongoose');
const Fine = require('../models/Fine');
const Loan = require('../models/Loan');
const User = require('../models/User');
const { logAudit } = require('../services/auditService');

async function getFines(req, res) {
  try {
    const { status, user_id, patron_id } = req.query || {};
    const query = {};

    if (status && status !== 'All') {
      query.status = { $regex: new RegExp(`^${status}$`, 'i') };
    }

    if (user_id && mongoose.Types.ObjectId.isValid(user_id)) {
      query.user_id = user_id;
    } else if (patron_id) {
      query.patron_id = patron_id;
    }

    const fines = await Fine.find(query).sort({ created_at: -1 }).lean();

    const formattedList = fines.map(f => {
      const fid = f._id.toString();
      return {
        id: fid,
        _id: fid,
        fine_id: fid,
        borrow_id: f.loan_id ? f.loan_id.toString() : null,
        user_id: f.user_id ? f.user_id.toString() : null,
        patron_id: f.patron_id || 'Unknown',
        patronId: f.patron_id || 'Unknown',
        patron_name: f.patron_name || 'Patron',
        patronName: f.patron_name || 'Patron',
        book_title: f.book_title || 'Unknown Title',
        bookTitle: f.book_title || 'Unknown Title',
        amount: f.amount || 0,
        status: f.status || 'Unpaid',
        payment_method: f.payment_method || null,
        method: f.payment_method || null,
        receipt_no: f.receipt_no || null,
        paid_at: f.paid_at || null,
        collected_by: f.collected_by || null,
        waiver_reason: f.waiver_reason || null,
        created_at: f.created_at || new Date().toISOString()
      };
    });

    res.json({
      total: formattedList.length,
      fines: formattedList
    });
  } catch (err) {
    console.error('Error fetching fines from MongoDB:', err);
    res.status(500).json({ error: 'Failed to retrieve fines list from database' });
  }
}

async function collectFine(req, res) {
  try {
    const { id } = req.params;
    const { payment_method = 'Cash' } = req.body || {};

    let fine = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      fine = await Fine.findById(id);
    }

    if (!fine) {
      fine = await Fine.findOne({ $or: [{ patron_id: id }, { receipt_no: id }] });
    }

    if (!fine) {
      return res.status(404).json({ error: 'Fine record not found in database' });
    }

    if (fine.status === 'Paid') {
      return res.status(400).json({ error: 'This fine has already been marked as Paid.' });
    }

    const receiptNo = `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    fine.status = 'Paid';
    fine.paid_at = new Date();
    fine.collected_by = req.user?.userId || req.user?.username || 'DESK_STAFF';
    fine.payment_method = payment_method;
    fine.receipt_no = receiptNo;
    await fine.save();

    // Check if patron should be unheld / un-frozen
    if (fine.user_id) {
      const remainingUnpaid = await Fine.countDocuments({ user_id: fine.user_id, status: 'Unpaid' });
      const remainingOverdue = await Loan.countDocuments({ user_id: fine.user_id, status: 'Overdue' });
      if (remainingUnpaid === 0 && remainingOverdue === 0) {
        await User.findByIdAndUpdate(fine.user_id, { status: 'Active' });
      }
    } else if (fine.patron_id) {
      const remainingUnpaid = await Fine.countDocuments({ patron_id: fine.patron_id, status: 'Unpaid' });
      const remainingOverdue = await Loan.countDocuments({ patron_id: fine.patron_id, status: 'Overdue' });
      if (remainingUnpaid === 0 && remainingOverdue === 0) {
        await User.findOneAndUpdate({ patron_id: fine.patron_id }, { status: 'Active' });
      }
    }

    await logAudit({
      actor_id: req.user?.userId || 'STAFF',
      action_key: 'fines.collect',
      target_resource: `FINE:${fine._id.toString()}`,
      payload: {
        patron: fine.patron_name,
        patron_id: fine.patron_id,
        amount: fine.amount,
        payment_method,
        receipt: receiptNo
      }
    });

    res.json({
      message: `Payment of ₹${fine.amount.toFixed(2)} recorded successfully via ${payment_method}.`,
      receipt_no: receiptNo,
      fine: {
        id: fine._id.toString(),
        ...fine.toObject()
      }
    });
  } catch (err) {
    console.error('Error collecting fine:', err);
    res.status(500).json({ error: 'Failed to record fine payment: ' + err.message });
  }
}

async function waiveFine(req, res) {
  try {
    const { id } = req.params;
    const { waiver_reason } = req.body || {};

    if (!waiver_reason || !waiver_reason.trim()) {
      return res.status(400).json({ error: 'A mandatory waiver justification reason is required for institutional audit compliance.' });
    }

    let fine = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      fine = await Fine.findById(id);
    }

    if (!fine) {
      fine = await Fine.findOne({ patron_id: id, status: 'Unpaid' });
    }

    if (!fine) {
      return res.status(404).json({ error: 'Fine record not found' });
    }

    fine.status = 'Waived';
    fine.waiver_reason = waiver_reason.trim();
    fine.paid_at = new Date();
    await fine.save();

    // Check if patron can be unheld
    if (fine.user_id) {
      const remainingUnpaid = await Fine.countDocuments({ user_id: fine.user_id, status: 'Unpaid' });
      const remainingOverdue = await Loan.countDocuments({ user_id: fine.user_id, status: 'Overdue' });
      if (remainingUnpaid === 0 && remainingOverdue === 0) {
        await User.findByIdAndUpdate(fine.user_id, { status: 'Active' });
      }
    }

    await logAudit({
      actor_id: req.user?.userId || 'ADMIN',
      action_key: 'fines.waive',
      target_resource: `FINE:${fine._id.toString()}`,
      payload: {
        patron: fine.patron_name,
        patron_id: fine.patron_id,
        amount: fine.amount,
        reason: waiver_reason
      }
    });

    res.json({
      message: `Fine of ₹${fine.amount.toFixed(2)} successfully waived.`,
      fine: {
        id: fine._id.toString(),
        ...fine.toObject()
      }
    });
  } catch (err) {
    console.error('Error waiving fine:', err);
    res.status(500).json({ error: 'Failed to waive fine: ' + err.message });
  }
}

module.exports = {
  getFines,
  collectFine,
  waiveFine
};
