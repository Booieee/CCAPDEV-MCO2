//Path to the user data
const fs = require('fs');
const path = require('path');
const { ObjectId } = require('mongodb');
const usersPath = path.join(__dirname, '..', 'model', 'data', 'users.json');

//Finding the users
function getUsers() {
  const data = fs.readFileSync(usersPath, 'utf-8');
  return JSON.parse(data);
}


//Searching for a matching email
function findUserByEmail(email) {
  const users = getUsers();
  return users.find(user => user.email === email);
}


//Adding new user to the database
function addUser(newUser) {
  const users = getUsers();
  users.push(newUser);

  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2)); // pretty print
}

//save user updates
function saveUsers(users) {
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
}


//create user
exports.createUser = async (req, res) => {
  const { email, firstname, lastname, password} = req.body;

  // Check if user already exists
  const existingUser = findUserByEmail(email);
  if (existingUser) {
    return res.render('login', { 
      registerError: 'User with this email already exists. Please login instead.',
      registerEmail: email,
      registerFname: firstname,
      registerLname: lastname
    });
  }

  // Generate a new ObjectId for the user
  const newObjectId = new ObjectId();

  const newUser = {
    _id: {
      $oid: newObjectId.toString()
    },
    email,
    firstname,
    lastname,
    password,
    role:'student', 
    profilePicture: '/default.png',
    reservations: []
  };

  addUser(newUser); // this writes to users.json
  req.session.userId = newUser.email;
  res.redirect('/dashboard');
};


//login user
exports.loginUser = (req, res) => {
  const { email, password } = req.body;
  console.log('Email: ', email);
  const searchUser = findUserByEmail(email);

  //User Validation
  if(searchUser == null){
    return res.render('login', { 
      error: 'User not found. Please check your email or register a new account.',
      email: email 
    });
  }

  //Password Validation
  if (searchUser.password !== password) {
    return res.render('login', { 
      error: 'Incorrect password. Please try again.',
      email: email 
    });
  }

  req.session.userId = searchUser.email;
  res.redirect('/dashboard');
};


//dashboard rendering 
exports.renderDashboard = async (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    return res.redirect('/');
  }

  const user = findUserByEmail(userId);

  if (!user) {
    return res.status(404).send('User not found');
  }

  res.render('dashboard', {
    isTechnician: user.role === 'technician',
    user,
    profilePic: user.profilePicture,
    title: 'Dashboard - Lab Reservations'
  });
};


//people page rendering
exports.renderPeoplePage = (req, res) => {
  const allUsers = getUsers(); // loads users.json
  const currentUserEmail = req.session.userId; // the logged-in user's email
  const currentUser = findUserByEmail(currentUserEmail);

  // Filter out the logged-in user + admins (unless current user is technician)
  let visibleUsers;
  if (currentUser.role === 'technician') {
    visibleUsers = allUsers.filter(u => u.email !== currentUserEmail);
  } else {
    visibleUsers = allUsers.filter(u => u.email !== currentUserEmail && u.role !== 'technician');
  }

  // Ensure all users have a profilePicture
  const processedUsers = visibleUsers.map(user => ({
    ...user,
    profilePicture: user.profilePicture || '/default.png',
    reservations: user.reservations || []
  }));

  res.render('people', { 
    users: processedUsers,
    currentUser,
    title: 'People - Lab Reservations'
  });
};


//profile page
exports.renderProfilePage = (req, res) => {
  const email = req.session.userId;
  const user = findUserByEmail(email);

  if (!user) {
    return res.status(404).send('User not found');
  }

  res.render('profile', { 
    user,
    title: 'Profile - Lab Reservations',
    profilePic: user.profilePicture
  });
};

//change password page
exports.renderChangePassword = (req, res) => {
  const email = req.session.userId;
  const user = findUserByEmail(email);

  if (!user) {
    return res.status(404).send('User not found');
  }

  res.render('changePassword', { 
    user,
    title: 'Change Password - Lab Reservations'
  });
};

//view other user's profile
exports.renderUserProfile = (req, res) => {
  const targetEmail = decodeURIComponent(req.params.email);
  const currentUserEmail = req.session.userId;
  
  const users = getUsers();
  const targetUser = users.find(u => u.email === targetEmail);
  const currentUser = users.find(u => u.email === currentUserEmail);

  if (!targetUser) {
    return res.status(404).send('User not found');
  }

  // Check if current user can view this profile
  if (!currentUser) {
    return res.status(401).send('Please log in to view profiles');
  }

  // Students can't view technician profiles unless they're technician themselves
  if (targetUser.role !== 'student' && currentUser.role === 'student') {
    return res.status(403).send('Access denied');
  }

  res.render('userProfile', { 
    targetUser,
    currentUser,
    title: `${targetUser.firstname} ${targetUser.lastname} - Profile`
  });
};


//edit profile
exports.editProfile = (req, res) => {
  try {
    const { email, firstname, lastname } = req.body;
    const users = getUsers(); // from users.json
    const userId = req.session.userId;

    // Validate required fields
    if (!email || !firstname || !lastname) {
      return res.status(400).send('All fields are required');
    }

    // Find user by current session email
    const userIndex = users.findIndex(u => u.email === userId);
    if (userIndex === -1) return res.status(404).send('User not found');

    const user = users[userIndex];

    // Check if new email already exists (if email is being changed)
    if (email !== userId) {
      const existingUser = users.find(u => u.email === email);
      if (existingUser) {
        return res.status(400).send('Email already exists. Please choose a different email.');
      }
    }

    // Update fields
    user.email = email;
    user.firstname = firstname;
    user.lastname = lastname;

    if (req.file) {
      user.profilePicture = '/uploads/' + req.file.filename;
    }

    // Update the user in the array
    users[userIndex] = user;
    
    // Update session if email changed
    req.session.userId = email;
    
    // Save changes to JSON file
    saveUsers(users);
    
    console.log('Profile updated successfully for user:', email);
    res.redirect('/profile');
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).send('Error updating profile');
  }
};


//delete profile
exports.deleteAccount = (req, res) => {
  const email = req.session.userId;
  let users = getUsers();

  const user = users.find(u => u.email === email);
  if (!user) return res.status(404).send('User not found');

  users = users.filter(u => u.email !== email);
  req.session.destroy(() => {
    saveUsers(users);
    res.redirect('/login'); // Redirect to login page after account deletion
  });
};


//change password
exports.changePassword = (req, res) => {
  const { oldPassword, newPassword, confirmPassword } = req.body;
  const userId = req.session.userId;
  const user = findUserByEmail(userId);

  // Validate old password
  if (user.password !== oldPassword) {
    return res.status(400).send('Incorrect current password');
  }

  // Check new passwords match
  if (newPassword !== confirmPassword) {
    return res.status(400).send('New passwords do not match');
  }

  user.password = newPassword;
  const users = getUsers();
  const userIndex = users.findIndex(u => u.email === userId);
  if (userIndex !== -1) {
    users[userIndex] = user;
    saveUsers(users);
  }

  res.redirect('/profile');
};
