//Path to the user data
const fs = require('fs');
const path = require('path');
const usersPath = path.join(__dirname, '..', 'model', 'data', 'users.json');
const labPath = path.join(__dirname, '..', 'model', 'data', 'lab.json');

//Finding the users
function getUsers() {
  const data = fs.readFileSync(usersPath, 'utf-8');
  return JSON.parse(data);
}

function findUserByEmail(email) {
  const users = getUsers();
  return users.find(user => user.email === email);
}

function getLabs(){
    const data = fs.readFileSync(labPath, 'utf-8');
    return JSON.parse(data);
}

//save user updates
function saveUsers(users) {
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
}

function saveLabs(labs){
    fs.writeFileSync(labPath, JSON.stringify(labs, null, 2))
}

function getStudentUsers(users){
    return users.filter(user => user.role === "student");
}

//rendering the reserve timeslot
exports.renderReservationPage = (req, res) => {
    const labs = getLabs();
    const currentUserEmail = req.session.userId;
    const user = findUserByEmail(currentUserEmail);
    labs.forEach(lab => {
        lab.timeslots.forEach(slot => {
            const available = Object.values(slot.seats).filter(Boolean).length;
            slot.availableSeats = available;
        });
    });

    res.render('reserveTimeslot', {
        user,
        labs,
        title: 'Reserve Timeslot - Lab Reservations'
    });
}

//creating reservation
exports.createReservation = (req, res) => {
  const { labId, slotId, seat, anonymous } = req.body;
  const email = req.session.userId;

  console.log("Received reservation request:", { labId, slotId, seat, anonymous, email });

  const users = getUsers();      
  const labs = getLabs();         

  const user = users.find(u => u.email === email);
  if (!user) {
    console.error("User not found:", email);
    return res.status(404).send("User not found");
  }

  // Convert labId to number for comparison since it comes as string from form
  const lab = labs.find(l => l.labId === parseInt(labId));
  if (!lab) {
    console.error("Lab not found:", labId);
    return res.status(404).send("Lab not found");
  }

  const slot = lab.timeslots.find(s => s.slotId === parseInt(slotId));
  if (!slot) {
    console.error("Slot not found:", slotId);
    return res.status(404).send("Timeslot not found");
  }

  // Check if seat is available
  if (!slot.seats[seat]) {
    console.error("Seat not available:", seat);
    return res.status(400).send("Seat not available");
  }

  // Check if user already has a reservation for this seat, lab, day, and timeslot
  const duplicate = (user.reservations || []).some(r =>
    r.labId === parseInt(labId) &&
    r.seat === seat &&
    r.day === slot.day &&
    r.startTime === slot.startTime &&
    r.endTime === slot.endTime
  );
  if (duplicate) {
    console.error("User already has a reservation for this seat, lab, and timeslot");
    return res.status(400).send("You already have a reservation for this seat, lab, and timeslot.");
  }

  const reservation = {
    name: anonymous === 'true' ? "Anonymous" : user.firstname,
    labId: parseInt(labId),
    room: lab.room,
    day: slot.day,
    startTime: slot.startTime,
    endTime: slot.endTime,
    seat
  };

  user.reservations = user.reservations || [];
  user.reservations.push(reservation);

  slot.seats[seat] = false; // mark seat as reserved

  saveUsers(users);
  saveLabs(labs);

  console.log("Reservation created successfully:", reservation);
  res.status(200).send("Reservation successful!");
};

//viewing reservations
exports.showAllReservations = (req, res) => {
  const users = getUsers();
  const currentUser = users.find(u => u.email === req.session.userId);

  if (!currentUser) return res.redirect('/titlepage.html');

  let allReservations = [];

  // Collect all reservations from all users
  users.forEach(user => {
    if (user.reservations && Array.isArray(user.reservations)) {
      user.reservations.forEach(reservation => {
        allReservations.push({
          name: reservation.name || `${user.firstname} ${user.lastname}`,
          email: user.email,
          room: reservation.room,
          day: reservation.day,
          startTime: reservation.startTime,
          endTime: reservation.endTime,
          seat: reservation.seat,
          isOwnReservation: user.email === currentUser.email,
          userRole: user.role,
          isAnonymous: reservation.name === "Anonymous"
        });
      });
    }
  });

  // Sort reservations by date and time
  allReservations.sort((a, b) => {
    const dateA = new Date(a.day + ', 2024 ' + a.startTime);
    const dateB = new Date(b.day + ', 2024 ' + b.startTime);
    return dateA - dateB;
  });

  // Get labs for filter dropdown
  const labs = getLabs().map(lab => ({ labId: lab.labId, room: lab.room }));

  res.render('viewReservation', { 
    reservations: allReservations,
    currentUser,
    labs, // pass labs to view
    title: 'View All Reservations - Lab Reservations'
  });
};

//editing reservations
exports.editReservations = (req, res) => {
  const users = getUsers();
  const students = getStudentUsers(users)
  const currentUser = users.find(u => u.email === req.session.userId);

  if (!currentUser) return res.redirect('/titlepage.html');

  let reservationsData = [];

  if (currentUser.role === 'admin') {
    users.forEach((stu, stuIdx) => {
      if (Array.isArray(stu.reservations)) {
        stu.reservations.forEach((res, resIdx) => {
          reservationsData.push({
            name: `${stu.firstname} ${stu.lastname}`,
            email: stu.email,
            reservation: res,
            userIndex: stuIdx,
            reservationIndex: resIdx
          });
        });
      }
    });
  } else {
    (currentUser.reservations || []).forEach((res, resIdx) => {
      reservationsData.push({
        name: currentUser.firstname + " " + currentUser.lastname,
        email: currentUser.email,
        reservation: res,
        userIndex: "self",
        reservationIndex: resIdx
      });
    });
  }

  const labs = getLabs();
  res.render('editReservation', {
    currentUser,
    students,
    labs,
    reservations: reservationsData,
    isAdmin: currentUser.role === 'admin',
    title: 'Edit Reservations - Lab Reservations'
  });
};

//updating reservation
exports.updateReservation = (req, res) => {
  const { email, oldReservation, updatedReservation } = req.body;
  const users = getUsers();
  const labs = getLabs();

  const user = users.find(u => u.email === email);
  if (!user) return res.status(404).send("User not found");

  const idx = user.reservations.findIndex(r =>
    r.room === oldReservation.room &&
    r.day === oldReservation.day &&
    r.startTime === oldReservation.startTime &&
    r.endTime === oldReservation.endTime &&
    r.seat === oldReservation.seat
  );
  if (idx === -1) return res.status(404).send("Original reservation not found");

  // Free old seat
  const oldLab = labs.find(l => l.room === oldReservation.room);
  const oldSlot = oldLab.timeslots.find(s =>
    s.day === oldReservation.day &&
    s.startTime === oldReservation.startTime &&
    s.endTime === oldReservation.endTime
  );
  if (oldSlot) oldSlot.seats[oldReservation.seat] = true;

  // Reserve new seat
  const newLab = labs.find(l => l.room === updatedReservation.room);
  const newSlot = newLab.timeslots.find(s =>
    s.day === updatedReservation.day &&
    s.startTime === updatedReservation.startTime &&
    s.endTime === updatedReservation.endTime
  );
  if (!newSlot || !newSlot.seats[updatedReservation.seat])
    return res.status(400).send("Seat not available");

  newSlot.seats[updatedReservation.seat] = false;

  // Update reservation
  user.reservations[idx] = {
    ...oldReservation,
    ...updatedReservation
  };

  saveUsers(users);
  saveLabs(labs);

  res.status(200).send("Reservation updated");
};

//deleting reservation
exports.deleteReservation = (req, res) => {
  const { email, reservation } = req.body;

  const users = getUsers();
  const labs = getLabs();

  const user = users.find(u => u.email === email);
  if (!user) return res.status(404).send("User not found");

  // Remove reservation from user's list
  user.reservations = user.reservations.filter(r =>
    !(
      r.room === reservation.room &&
      r.day === reservation.day &&
      r.startTime === reservation.startTime &&
      r.endTime === reservation.endTime &&
      r.seat === reservation.seat
    )
  );

  // Free up the seat in labs.json
  const lab = labs.find(l => l.room === reservation.room);
  const slot = lab ? lab.timeslots.find(s =>
    s.day === reservation.day &&
    s.startTime === reservation.startTime &&
    s.endTime === reservation.endTime
  ) : null;

  if (slot) slot.seats[reservation.seat] = true;

  saveUsers(users);
  saveLabs(labs);

  res.status(200).send("Reservation deleted");
};

// Walk-in reservation functionality
exports.renderWalkinPage = (req, res) => {
  const labs = getLabs();
  const currentUserEmail = req.session.userId;
  const user = findUserByEmail(currentUserEmail);

  // Check if user is admin or technician
  if (user.role !== 'admin' && user.role !== 'technician') {
    return res.status(403).send('Access denied. Only administrators and technicians can access this page.');
  }

  labs.forEach(lab => {
    lab.timeslots.forEach(slot => {
      const available = Object.values(slot.seats).filter(Boolean).length;
      slot.availableSeats = available;
    });
  });

  res.render('walkinReservation', {
    user,
    labs,
    title: 'Walk-in Reservation - Lab Reservations'
  });
};

// Create walk-in reservation
exports.createWalkinReservation = (req, res) => {
  const { studentEmail, studentName, labId, slotId, seat, anonymous, technicianEmail } = req.body;
  
  const users = getUsers();
  const labs = getLabs();
  const technician = users.find(u => u.email === technicianEmail);

  if (!technician || (technician.role !== 'admin' && technician.role !== 'technician')) {
    return res.status(403).send('Only administrators and technicians can create walk-in reservations.');
  }

  // Find or create student
  let student = null;
  if (studentEmail) {
    student = users.find(u => u.email === studentEmail);
  }

  // If student doesn't exist and we have a name, create a temporary student record
  if (!student && studentName) {
    student = {
      email: `walkin_${Date.now()}@dlsu.edu.ph`,
      firstname: studentName.split(' ')[0] || studentName,
      lastname: studentName.split(' ').slice(1).join(' ') || 'Walk-in',
      password: 'temp_password',
      role: 'student',
      profilePicture: '/default.png',
      reservations: [],
      isWalkin: true
    };
    users.push(student);
  }

  if (!student) {
    return res.status(400).send('Student not found and no name provided.');
  }

  const lab = labs.find(l => l.labId === parseInt(labId));
  if (!lab) return res.status(404).send("Lab not found");

  const slot = lab.timeslots.find(s => s.slotId === parseInt(slotId));
  if (!slot) return res.status(404).send("Timeslot not found");

  // Check if seat is available
  if (!slot.seats[seat]) {
    return res.status(400).send("Seat not available");
  }

  const reservation = {
    name: anonymous === 'true' ? "Anonymous" : student.firstname,
    labId: parseInt(labId),
    room: lab.room,
    day: slot.day,
    startTime: slot.startTime,
    endTime: slot.endTime,
    seat,
    createdBy: technicianEmail,
    createdAt: new Date().toISOString(),
    isWalkin: true
  };

  student.reservations = student.reservations || [];
  student.reservations.push(reservation);

  slot.seats[seat] = false; // mark seat as reserved

  saveUsers(users);
  saveLabs(labs);

  res.status(200).send("Walk-in reservation created successfully!");
};

// Get recent walk-in reservations
exports.getRecentWalkinReservations = (req, res) => {
  const users = getUsers();
  const currentUserEmail = req.session.userId;
  const currentUser = users.find(u => u.email === currentUserEmail);

  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'technician')) {
    return res.status(403).send('Access denied.');
  }

  const recentReservations = [];
  users.forEach(user => {
    if (user.reservations) {
      user.reservations.forEach(reservation => {
        if (reservation.isWalkin) {
          recentReservations.push({
            id: `${user.email}_${reservation.seat}_${reservation.day}_${reservation.startTime}`,
            studentEmail: user.email,
            studentName: user.firstname + ' ' + user.lastname,
            room: reservation.room,
            seat: reservation.seat,
            day: reservation.day,
            startTime: reservation.startTime,
            endTime: reservation.endTime,
            technicianName: users.find(u => u.email === reservation.createdBy)?.firstname + ' ' + 
                          users.find(u => u.email === reservation.createdBy)?.lastname || 'Unknown',
            createdAt: reservation.createdAt
          });
        }
      });
    }
  });

  // Sort by creation date (most recent first)
  recentReservations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json(recentReservations.slice(0, 10)); // Return only the 10 most recent
};

// Cancel walk-in reservation
exports.cancelWalkinReservation = (req, res) => {
  const { reservationId } = req.body;
  const currentUserEmail = req.session.userId;
  
  const users = getUsers();
  const labs = getLabs();
  const currentUser = users.find(u => u.email === currentUserEmail);

  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'technician')) {
    return res.status(403).send('Access denied.');
  }

  // Parse reservation ID to find the reservation
  const [studentEmail, seat, day, startTime] = reservationId.split('_');
  
  const student = users.find(u => u.email === studentEmail);
  if (!student) return res.status(404).send("Student not found");

  // Find and remove the reservation
  const reservationIndex = student.reservations.findIndex(r => 
    r.seat === seat && r.day === day && r.startTime === startTime && r.isWalkin
  );

  if (reservationIndex === -1) return res.status(404).send("Reservation not found");

  const reservation = student.reservations[reservationIndex];
  student.reservations.splice(reservationIndex, 1);

  // Free up the seat
  const lab = labs.find(l => l.room === reservation.room);
  const slot = lab ? lab.timeslots.find(s =>
    s.day === reservation.day &&
    s.startTime === reservation.startTime &&
    s.endTime === reservation.endTime
  ) : null;

  if (slot) slot.seats[reservation.seat] = true;

  saveUsers(users);
  saveLabs(labs);

  res.status(200).send("Walk-in reservation cancelled successfully!");
};

// Get reservation details for a specific seat
exports.getReservationDetails = (req, res) => {
  const { labId, slotId, seatId } = req.params;
  
  const users = getUsers();
  const labs = getLabs();
  
  const lab = labs.find(l => l.labId === parseInt(labId));
  if (!lab) return res.status(404).send("Lab not found");

  const slot = lab.timeslots.find(s => s.slotId === parseInt(slotId));
  if (!slot) return res.status(404).send("Timeslot not found");

  // Find the user who has this reservation
  let reservationDetails = null;
  users.forEach(user => {
    if (user.reservations) {
      user.reservations.forEach(reservation => {
        if (reservation.labId === parseInt(labId) && 
            reservation.seat === seatId &&
            reservation.day === slot.day &&
            reservation.startTime === slot.startTime) {
          reservationDetails = {
            name: reservation.name,
            userEmail: user.email,
            isAnonymous: reservation.name === "Anonymous"
          };
        }
      });
    }
  });

  if (reservationDetails) {
    res.json(reservationDetails);
  } else {
    res.status(404).send("Reservation not found");
  }
};

// Search functionality
exports.renderSearchPage = (req, res) => {
  const labs = getLabs();
  const currentUserEmail = req.session.userId;
  const user = findUserByEmail(currentUserEmail);

  res.render('search', {
    user,
    labs,
    title: 'Search - Lab Reservations'
  });
};

// Search available slots
exports.searchSlots = (req, res) => {
  const { labId, date, time } = req.query;
  const labs = getLabs();

  let results = [];

  labs.forEach(lab => {
    // Filter by lab if specified
    if (labId && lab.labId !== parseInt(labId)) {
      return;
    }

    lab.timeslots.forEach(slot => {
      // Filter by date if specified (compare as string)
      if (date && slot.day !== date) {
        return;
      }

      // Filter by time if specified
      if (time && slot.startTime !== time) {
        return;
      }

      const totalSeats = Object.keys(slot.seats).length;
      const availableSeats = Object.values(slot.seats).filter(Boolean).length;

      if (availableSeats > 0) {
        results.push({
          labId: lab.labId,
          room: lab.room,
          slotId: slot.slotId,
          day: slot.day,
          startTime: slot.startTime,
          endTime: slot.endTime,
          totalSeats,
          availableSeats
        });
      }
    });
  });

  res.json(results);
};

// Search users
exports.searchUsers = (req, res) => {
  const { name, email } = req.query;
  const users = getUsers();
  const currentUserEmail = req.session.userId;
  const currentUser = findUserByEmail(currentUserEmail);

  let results = users.filter(user => {
    // Don't include current user in search results
    if (user.email === currentUserEmail) {
      return false;
    }

    // Filter by name if specified
    if (name) {
      const fullName = `${user.firstname} ${user.lastname}`.toLowerCase();
      if (!fullName.includes(name.toLowerCase())) {
        return false;
      }
    }

    // Filter by email if specified
    if (email) {
      if (!user.email.toLowerCase().includes(email.toLowerCase())) {
        return false;
      }
    }

    return true;
  });

  // Remove sensitive information
  results = results.map(user => ({
    email: user.email,
    firstname: user.firstname,
    lastname: user.lastname,
    profilePicture: user.profilePicture || '/default.png'
  }));

  res.json(results);
};