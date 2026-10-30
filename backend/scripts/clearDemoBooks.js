require('dotenv').config();
const mongoose = require('mongoose');

async function clearDemo() {
  const uri = process.env.MongoDB_URI || process.env.MONGODB_URI;
  await mongoose.connect(uri);
  const titles = [
    'Higher Engineering Mathematics',
    'Operating System Concepts',
    'Database System Concepts',
    'Digital Signal Processing: Principles & Applications',
    'Robbins & Cotran Pathologic Basis of Disease'
  ];
  const res = await mongoose.connection.db.collection('books').deleteMany({
    title: { $in: titles }
  });
  console.log('Deleted demo books:', res.deletedCount);
  const total = await mongoose.connection.db.collection('books').countDocuments();
  console.log('Total books remaining in Atlas:', total);
  await mongoose.disconnect();
}

clearDemo().catch(err => {
  console.error(err);
  process.exit(1);
});
