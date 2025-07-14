const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: String,
  firstname: String,
  lastname: String,
  password: String,
  profilePicture: { type: String, default: '/images/default.png' },
  role: { type: String, default: 'student' },
  reservations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reservation' }]
});

module.exports = mongoose.model('User', userSchema);
