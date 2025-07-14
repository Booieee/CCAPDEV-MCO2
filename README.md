# CCAPDEV-MCO2

## Project Overview
This application serves 2 main user role: students who can reserve lab timeslots along with editing and deleting them, view other accounts, and edit their own profile, and lab technicians who create walk-in reservations and handle the data of the students. Data is placed in a JSON file (users.json and lab.json)

## Features
1. User Authentication and Account Creation
- Session based login (using email as the unique ID)
- role-based access: either student or lab tech
- Register a new account to the database

2. Profile Management
- View profile details (first and last name, profile picture, and email) and current reservations
- Edit profile details and profile picture (Multer file upload)
- Change password (old Password, confirmation match for new Password)
- Deletion of own account with confirmation

3. Dashboard
- Sidebar navigation for access to the different features.
- Walk-in Reservation Feature is only available for lab techs.

4. Reservation of Timeslots
-  Reserve Timeslots for a certain lab
- Lab techs can create lab timeslots for walk-in students.
- Search for available timeslots and seats
- Edit made reservations

5. People Feature
- See the reservations (if non-anonymous) and profiles of other users


## Prerequisites
- Node.js to run the server

## Running the App
1. Open the command prompt on the project folder
2. Type node seedDatabase.js to insert existing data
3. Type node app.js and Ctrl+Click on http:localhost:3000 to start the application


## Directory Structure

### Entry Point
app.js
seedDatabase.js

### Model Folder
labSchema.js 
reservationSchema
slotSchema
userSchema
### Data Folder within Model Folder
users.json 
lab.json 

### Controller Folder
reservationController (all logic regarding reservations)
userController (all logic regarding user features)

### Views Folder
all handlebars for every page feature

### Public Folder
style sheet
images (logo, default profile picture, and miscellaneous)


## Usage
## Student Profile
1. Click the profile icon/navbar
2. Home to return to the dashboard
3. View Profile to view email, name, profile picture, and reservation list
4. Click Edit Profile to update details or upload a new picture
5. Click delete account to remove your account.

## Change Password 
1. Navigate to Change Password under your profile.
2.  Enter current password, new password, and confirm.
3. Submit; mismatches or incorrect old password show an error.

## Reserve Timeslot
1. Use Reserve Lab Timeslot sidebar link.
2. Select a laboratory and a timeslot.
3. Click on a seat that will display to see a confirmation page (checkbox to whether remain anonymous)
4. To finalize reservation, click on the shopping cart to see confirmation and list of reservations in cart.
5. Press confirm and be redirect to the dashboard

## People
1. Click on People in the dashboard
2. This will redirect to a page displaying all the users except for lab techs
3. Clicking on a user will displayed their profile and reservations

## View All Reservations
1. Click the View All Reservations in the dashboard
2. This will redirect the user to page displaying all the reservations in the database.
3. Filters can be applied to see specific reservations
4. View of other users' profiles and editing of own reservations is also access on this page

## Edit Reservations
1. Click the Edit Reservations in the dashboard
2. This will display all reservations the user has made 
3. Clicking the edit button will allow the user to change the room, day, time, and seat of the reservation.
4. Save Changes will finalize the edit.
5. Delete reservation will delete the reservation for the database

## Search Feature 
1. Click Search in the dashboard
2. From this page, the user can search available timeslots and search for users.
3. On search available slots, filters can be applied for labs, dates, and time.
4. Click search will display all timeslots that features a criteria.
5. On search users, user can search by name or email.
6. Click on search user will display users that fit the criteria.

## Walk-in Reservation
1. If the user is classified as a technician, they have access to Walk-in Reservation from the dashboard.
2. This will redirect the techician to a form wherein they have fill out details regarding the walk-in student's reservation.
3. Clicking Create Walk-in Reservation will create an account that user in the database along with their reservations.

## Manage Reservations
1. From the dashboard, Manage Reservations allows the lab tech to see the information regarding every student's reservation.
2. Clicking the cancel button allows the lab tech to cancel the reservation after a confirmation

## API Endpoints

### Authentication & User Management

| Method | Endpoint                            | Description                       
|--------|-------------------------------------|-----------------------------------
| GET    | `/`                                 | Render login page                  
| POST   | `/login`                            | Authenticate existing user         
| POST   | `/register`                         | Create new user account           
| GET    | `/logout`                           | Destroy session and log out        

---

### Profile Routes

| Method | Endpoint                            | Description                        
|--------|-------------------------------------|-------------------------------------
| GET    | `/profile`                          | View logged-in user's profile       
| GET    | `/profile/:email`                   | View another user profile         
| POST   | `/profile/edit`                     | Edit user profile 
| POST   | `/profile/delete`                   | Delete account                     
| GET    | `/changepassword`                   | View password change form        
| POST   | `/profile/changepassword`           | Submit password update            

---

### Reservation Routes

| Method | Endpoint                            | Description                      
|--------|-------------------------------------|--------------------------------------
| GET    | `/reserve`                          | Render reservation page      
| POST   | `/reserve/create`                   | Reserve a lab slot                  
| GET    | `/viewreservations`                 | View reservations list              
| GET    | `/editreservations`                 | Render reservation editor           
| POST   | `/reservation/update`               | Update reservation details           
| POST   | `/reservation/delete`               | Delete reservation                   
| GET    | `/reservation/details/:labId/:slotId/:seatId` | View specific reservation info   

---

### Admin Walk-In Reservations

| Method | Endpoint                            | Description                       
|--------|-------------------------------------|--------------------------------------
| GET    | `/walkin`                           | Render walk-in form                 
| POST   | `/walkin/create`                    | Create walk-in reservation          
| GET    | `/walkin/recent`                    | View recent walk-ins                
| POST   | `/walkin/cancel`                    | Cancel a walk-in reservation        
---

### Search Functionality

| Method | Endpoint                            | Description                       
|--------|-------------------------------------|--------------------------------------
| GET    | `/search`                           | Render search dashboard              
| GET    | `/search/slots`                     | Search lab slots                     
| GET    | `/search/users`                     | Search user profiles                

---

### Technician Tools

| Method | Endpoint                            | Description                         
|--------|-------------------------------------|--------------------------------------
| GET    | `/manage-reservations`              | Technician reservation panel       
| POST   | `/manage-reservations/cancel`       | Technician cancel reservation       

---

### Page Rendering Routes

| Method | Endpoint                            | Description                        
|--------|-------------------------------------|--------------------------------------
| GET    | `/dashboard`                        | Main dashboard for users            
| GET    | `/people`                           | View of all users              