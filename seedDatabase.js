const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Import models
const User = require('./model/userSchema');
const Laboratory = require('./model/labSchema');
const Reservation = require('./model/reservationSchema');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/lab-reservation')
.then(() => console.log('Connected to MongoDB for seeding'))
.catch(err => console.error('MongoDB connection error:', err));

// Read JSON data
const usersData = JSON.parse(fs.readFileSync(path.join(__dirname, 'model', 'data', 'users.json'), 'utf-8'));
const labsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'model', 'data', 'lab.json'), 'utf-8'));

// Function to convert MongoDB extended JSON ObjectId format to plain string
function convertObjectIds(data) {
  if (Array.isArray(data)) {
    return data.map(item => convertObjectIds(item));
  } else if (data && typeof data === 'object') {
    const converted = {};
    for (const [key, value] of Object.entries(data)) {
      if (key === '_id' && value && typeof value === 'object' && value.$oid) {
        // Convert { "$oid": "..." } to plain string
        converted[key] = value.$oid;
      } else if (Array.isArray(value)) {
        converted[key] = convertObjectIds(value);
      } else if (value && typeof value === 'object') {
        converted[key] = convertObjectIds(value);
      } else {
        converted[key] = value;
      }
    }
    return converted;
  }
  return data;
}

async function seedDatabase() {
  try {
    console.log('Starting database seeding...');
    
    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Laboratory.deleteMany({});
    await Reservation.deleteMany({});

    console.log('Cleared existing data');

    // Convert ObjectId formats
    const convertedUsersData = convertObjectIds(usersData);
    const convertedLabsData = convertObjectIds(labsData);

    // Insert labs first (so we can reference them in reservations)
    console.log('Inserting laboratories...');
    const laboratories = await Laboratory.insertMany(convertedLabsData);
    console.log(`Seeded ${laboratories.length} laboratories`);

    // Insert users without reservations
    console.log('Inserting users (without reservations)...');
    const usersToInsert = convertedUsersData.map(u => ({ ...u, reservations: [] }));
    const users = await User.insertMany(usersToInsert);
    console.log(`Seeded ${users.length} users`);

    // Create reservations and update users
    let reservationCount = 0;
    for (const userData of convertedUsersData) {
      if (userData.reservations && userData.reservations.length > 0) {
        const user = users.find(u => u.email === userData.email);
        for (const res of userData.reservations) {
          // Find the lab by labId
          const lab = laboratories.find(l => l.labId === res.labId);
          if (!lab) continue;
          // Create reservation
          const reservation = await Reservation.create({
            userId: user._id,
            labId: lab._id,
            firstname: user.firstname,
            room: res.room,
            startTime: res.startTime,
            endTime: res.endTime,
            seat: res.seat
          });
          user.reservations.push(reservation._id);
          reservationCount++;
        }
        await user.save();
      }
    }
    console.log(`Seeded ${reservationCount} reservations`);

    // Verify data was actually saved
    console.log('Verifying saved data...');
    const savedUsers = await User.find({});
    const savedLabs = await Laboratory.find({});
    const savedReservations = await Reservation.find({});
    console.log(`Verified: ${savedUsers.length} users, ${savedLabs.length} laboratories, ${savedReservations.length} reservations in database`);

    console.log('Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    console.error('Error details:', error.message);
    if (error.errors) {
      console.error('Validation errors:', error.errors);
    }
    process.exit(1);
  }
}

seedDatabase(); 