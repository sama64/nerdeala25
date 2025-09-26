# database setup — nerdeala vibeathon

## purpose
persist data (users, courses, students, notifications, reports). move from fake data to real persistence (sqlite/pg).

## schema
- users: id, name, email, role  
- courses: id, name, desc, teacher_id fk  
- students: id, user_id fk, progress, attendance  
- notifications: id, student_id fk, message, date, status  
- reports: id, student_id fk, data, date  

## relationships
- user ↔ student (1:1)  
- course ↔ users (1:n)  
- student ↔ notifications (1:n)  
- student ↔ reports (1:n)  

## implementation
- orm: sqlalchemy/prisma  
- repositories per entity (crud)  
- transactions for writes  
- integrity validation  

## phases
1. init: create sqlite + tables  
2. migration: move fake data → db  
3. validation: test access works  

## optimization
- indexes on user_id/course_id  
- cache common queries  
- sync with classroom on scheduled tasks  

## conclusion
solid db, clear relations, ready to scale and mirror classroom in real time.
