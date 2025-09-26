# implementation steps — nerdeala vibeathon

## user flow
1. link classroom account (integration screen)  
2. google login → permissions  
3. confirmation message  
4. progress dashboard  
5. student detail view (grades, tasks, metrics)  
6. notifications (list, mark read)  
7. submissions status (submitted/late/missing)  
8. attendance module  

## routes
- /integracion-google-classroom  
- /autenticacion  
- /confirmacion-vinculacion  
- /panel-progreso  
- /detalles-estudiante  
- /notificaciones  
- /estado-entregas  
- /seguimiento-asistencia  

## user stories
- classroom integration: sync courses/students  
- progress panel: metrics + filters  
- notifications: alerts <5min new tasks  
- submissions: live states + filters  
- feedback: secure form  

## phases
1. local feature development  
2. integrate classroom api + auth  
3. integrate db for persistence  

## conclusion
covers classroom, progress, notifications, submissions, attendance end-to-end.
