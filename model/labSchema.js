const mongoose = require('mongoose');
const slotSchema = require('./slotSchema');

// Main Laboratory schema
const laboratorySchema = new mongoose.Schema({
  labId: {
    type: Number,
    required: true,
    unique: true
  },
  room: {
    type: String,
    required: true
  },
  seats: Number,
  timeslots: [slotSchema]
});

module.exports = mongoose.model('Laboratory', laboratorySchema);