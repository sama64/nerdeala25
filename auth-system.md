# authentication system — nerdeala vibeathon

## purpose
ensure user security and privacy. handle sessions and roles with route protection.

## architecture
- login/register/recovery/email verification  
- sessions with jwt  
- middleware in server to validate tokens  
- roles: student, teacher, coordinator, admin  

## flow
1. registration → store user + send verification mail  
2. login → validate creds → issue jwt  
3. password recovery → unique link via email  
4. verification → confirm email before use  

## middleware
- validates jwt on each request  
- redirects to login if no auth  
- verifies role before accessing protected routes  

## user model
- id  
- name  
- email  
- password hash  
- verification status  
- role  

## phases
- design: models + flows  
- development: auth endpoints + mails  
- integration: protect sensitive routes  
- testing: valid/expired creds, redirects, roles  

## user profile
- page to update info  
- change password  
- see verification status  

## conclusion
robust auth system, in spanish, protecting sensitive routes and giving clear ux.
