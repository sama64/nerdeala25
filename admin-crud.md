# admin panel — nerdeala vibeathon

## overview
the admin panel centralizes management of users, courses, students, notifications, and reports. built on next.js + fastapi with persistent db (sqlite/pg). all operations use crud with strict validation. access is protected by roles.

## entities
- **users**: admins, teachers, students, coordinators  
- **courses**: classroom metadata  
- **students**: progress + user data  
- **notifications**: messages sent  
- **reports**: metrics + analytics  

## crud operations
- users: create/edit/delete, roles  
- courses: add/remove/update  
- students: update data/progress  
- notifications: create, list, delete  
- reports: generate and export  

## integrity & sync
- referential integrity with fk  
- validation on client and server  
- real-time updates (websockets)  

## audit
- change logs with user + timestamp  
- easy queries for review  

## search & filters
- full-text search  
- advanced filters (status, cohort, notif)  

## admin dashboard
- performance graphs  
- student participation stats  
- success indicators  

## access control
- permissions by role  
- granularity in crud  

## extras
- batch operations  
- export csv/xlsx/pdf  
- import users/courses  
- system monitoring  
- security logs  

## conclusion
this panel professionalizes management and gives complete tools in spanish for admins, coordinators, and teachers.
