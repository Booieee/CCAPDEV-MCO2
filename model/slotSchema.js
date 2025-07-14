const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
  slotId: {
    type: Number,
    required: true
  },
  day: {
    type: String,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  seats: {
    type: Map,
    of: Boolean,
    default: {}
  }
}, { _id: false });

module.exports = slotSchema; 