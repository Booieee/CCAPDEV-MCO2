const express = require('express');
const exphbs = require('express-handlebars');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');

const port = 3000;

const app = express();

// Middleware
app.use(express.static(__dirname + "/public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // set to true if using https
}));

// Handlebars configuration
app.engine('hbs', exphbs.engine({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views', 'layouts'),
  partialsDir: path.join(__dirname, 'views', 'partials'),
  helpers: {
    json: function(context) {
      return JSON.stringify(context);
    },
    countOwn: function(reservations, userEmail) {
      return reservations.filter(r => r.email === userEmail).length;
    },
    countToday: function(reservations) {
      const today = new Date().toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric' 
      });
      return reservations.filter(r => r.day === today).length;
    },
    countAnonymous: function(reservations) {
      return reservations.filter(r => r.isAnonymous).length;
    },
    encodeURIComponent: function(str) {
      return encodeURIComponent(str);
    },
    eq: function(a, b) {
      return a === b;
    }
  }
}));

app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/lab-reservation')
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

const userController = require('./controller/userController');
const reservationController = require('./controller/reservationController');

//titlepage rendering
app.get('/', (req, res) => res.render('login', {}));
app.get('/login', (req, res) => res.render('login', {}));

//login and creation handling
app.post('/login', userController.loginUser);
app.post('/register', userController.createUser);

//dashboard rendering
app.get('/dashboard', userController.renderDashboard);

//people page rendering
app.get('/people', userController.renderPeoplePage);

//profile pages
app.get('/profile', userController.renderProfilePage);
app.get('/profile/:email', userController.renderUserProfile);
app.get('/changepassword', userController.renderChangePassword);

//edit profile
const multer = require('multer');
const upload = multer({ dest: path.join(__dirname, 'public', 'uploads') });
app.post('/profile/edit', upload.single('profilePicture'), userController.editProfile);

//delete profile
app.post('/profile/delete', userController.deleteAccount);

//change password
app.post('/profile/changepassword', userController.changePassword);

//all timeslots rendering and reservation making
app.get('/reserve', reservationController.renderReservationPage);
app.post('/reserve/create', reservationController.createReservation);

//view all reservations page
app.get('/viewreservations', reservationController.showAllReservations);

//edit reservation page
app.get('/editreservations', reservationController.editReservations);
app.post('/reservation/update', reservationController.updateReservation);
app.post('/reservation/delete', reservationController.deleteReservation);

//walk-in reservation routes
app.get('/walkin', reservationController.renderWalkinPage);
app.post('/walkin/create', reservationController.createWalkinReservation);
app.get('/walkin/recent', reservationController.getRecentWalkinReservations);
app.post('/walkin/cancel', reservationController.cancelWalkinReservation);

//reservation details route
app.get('/reservation/details/:labId/:slotId/:seatId', reservationController.getReservationDetails);

//search routes
app.get('/search', reservationController.renderSearchPage);
app.get('/search/slots', reservationController.searchSlots);
app.get('/search/users', reservationController.searchUsers);

// Add manage reservations route for technicians/admins
app.get('/manage-reservations', reservationController.manageReservations);

// Technician cancel reservation endpoint
app.post('/manage-reservations/cancel', reservationController.technicianCancelReservation);

//logout and destroy all session data
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).send('Failed to log out');
    }
    res.redirect('/');
  });
});

app.listen(port, () => {
    console.log("Server now listening on port http://localhost:" + port);
});
