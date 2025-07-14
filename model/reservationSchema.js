const { Schema, Types } = require('mongoose');

const reservationSchema = new Schema({
  userId: {
    type: Types.ObjectId,
    ref: 'User',
    required: true
  },
  labId: {
    type: Types.ObjectId,
    ref: 'Laboratory',
    required: true
  },
  firstname: String, 
  room: String, 
  startTime: String,
  endTime: String,
  seat: String
}, { timestamps: true }); // adds createdAt and updatedAt

module.exports = require('mongoose').model('Reservation', reservationSchema);